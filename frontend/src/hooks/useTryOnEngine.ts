import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { GlassesProduct } from "@/data/products";
import { PRODUCTS } from "@/data/products";
import { TRACKING_CONFIG } from "@/config/store";
import type { ViewportTransform } from "@/lib/vto/faceTracking";
import { coverTransform, measureFace } from "@/lib/vto/faceTracking";
import { GlassesPositioner, drawDebugOverlay, drawGlasses } from "@/lib/vto/glassesPosition";
import type { FaceShapeId } from "@/lib/vto/faceShape";
import { FaceShapeEstimator, measureFaceShapeMetrics } from "@/lib/vto/faceShape";
import { RollingAverage } from "@/lib/vto/smoothing";

export type FaceStatus = "searching" | "tracked" | "multiple";

export interface DebugMetrics {
  fps: number;
  landmarkCount: number;
  eyeDistance: number;
  rotationDeg: number;
  yawDeg: number;
  pitchDeg: number;
  scale: number;
  latencyMs: number;
}

const EMPTY_METRICS: DebugMetrics = {
  fps: 0,
  landmarkCount: 0,
  eyeDistance: 0,
  rotationDeg: 0,
  yawDeg: 0,
  pitchDeg: 0,
  scale: 0,
  latencyMs: 0,
};

interface EngineOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  landmarkerRef: React.RefObject<FaceLandmarker | null>;
  product: GlassesProduct;
  mirrored: boolean;
  debug: boolean;
  smoothingFactor: number;
  enabled: boolean;
}

/** ~4 UI updates per second: the render loop must not drive React every frame. */
const STATE_PUSH_INTERVAL_MS = 250;

/**
 * The face-tracking render loop. It runs entirely on requestAnimationFrame and
 * mutates refs — React state is only touched a few times per second for the
 * status pill and the debug HUD, so the UI never re-renders per video frame.
 */
export function useTryOnEngine(options: EngineOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const positionerRef = useRef(new GlassesPositioner());
  const shapeEstimatorRef = useRef(new FaceShapeEstimator());
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const lastTimestampRef = useRef(-1);
  const missingFaceFramesRef = useRef(0);

  const [faceStatus, setFaceStatus] = useState<FaceStatus>("searching");
  const [metrics, setMetrics] = useState<DebugMetrics>(EMPTY_METRICS);
  const [detectedFaceShape, setDetectedFaceShape] = useState<FaceShapeId | null>(null);

  // Preload every frame asset once so switching models is instant.
  useEffect(() => {
    const cache = imageCacheRef.current;
    for (const product of PRODUCTS) {
      if (cache.has(product.image)) continue;
      const img = new Image();
      img.src = product.image;
      cache.set(product.image, img);
    }
  }, []);

  const { enabled } = options;

  useEffect(() => {
    if (!enabled) return;
    let frameId = 0;
    let disposed = false;

    const fpsAverage = new RollingAverage(30);
    const latencyAverage = new RollingAverage(30);
    let lastFrameTime = performance.now();
    let lastPush = 0;
    let pendingStatus: FaceStatus = "searching";
    let pendingFaceShape: FaceShapeId | null = null;
    let pendingMetrics: DebugMetrics = EMPTY_METRICS;

    const loop = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(loop);

      const now = performance.now();
      const delta = now - lastFrameTime;
      lastFrameTime = now;
      if (delta > 0) fpsAverage.push(1000 / delta);

      const opts = optionsRef.current;
      const video = opts.videoRef.current;
      const canvas = opts.canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const targetWidth = Math.round(cssWidth * dpr);
      const targetHeight = Math.round(cssHeight * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const viewport: ViewportTransform = {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        mirrored: opts.mirrored,
      };

      const landmarker = opts.landmarkerRef.current;
      const positioner = positionerRef.current;
      const image = imageCacheRef.current.get(opts.product.image);

      // Frozen preview: keep the last transform on screen, run no detection.
      if (video.paused || !landmarker) {
        if (image?.complete) drawGlasses(ctx, image, positioner.value, opts.product);
        return;
      }

      let timestamp = now;
      if (timestamp <= lastTimestampRef.current) timestamp = lastTimestampRef.current + 1;
      lastTimestampRef.current = timestamp;

      const detectStart = performance.now();
      let faces: ReturnType<FaceLandmarker["detectForVideo"]> | null = null;
      try {
        faces = landmarker.detectForVideo(video, timestamp);
      } catch {
        return;
      }
      latencyAverage.push(performance.now() - detectStart);

      const landmarkSets = faces?.faceLandmarks ?? [];

      if (landmarkSets.length > 1) {
        pendingStatus = "multiple";
        positioner.decay(opts.smoothingFactor);
        return;
      }

      if (landmarkSets.length === 0) {
        missingFaceFramesRef.current += 1;
        if (missingFaceFramesRef.current > TRACKING_CONFIG.lostFaceGraceFrames) {
          pendingStatus = "searching";
          positioner.reset();
          shapeEstimatorRef.current.reset();
          pendingFaceShape = null;
        } else {
          const held = positioner.decay(opts.smoothingFactor);
          if (image?.complete) drawGlasses(ctx, image, held, opts.product);
        }
        return;
      }

      missingFaceFramesRef.current = 0;
      const landmarks = landmarkSets[0];
      const measurement = measureFace(landmarks, faces?.facialTransformationMatrixes?.[0], viewport);
      if (!measurement) {
        pendingStatus = "searching";
        return;
      }

      pendingStatus = "tracked";

      // Face-shape proportions are only sampled on a near-frontal head, so
      // foreshortening cannot skew the classification.
      const shapeMetrics = measureFaceShapeMetrics(
        landmarks,
        viewport,
        measurement.yaw,
        measurement.pitch,
      );
      if (shapeMetrics) shapeEstimatorRef.current.push(shapeMetrics);
      pendingFaceShape = shapeEstimatorRef.current.result?.shape ?? null;

      const transform = positioner.update(measurement, opts.product, opts.smoothingFactor);
      if (image?.complete) drawGlasses(ctx, image, transform, opts.product);
      if (opts.debug) drawDebugOverlay(ctx, landmarks, measurement, viewport);

      pendingMetrics = {
        fps: Math.round(fpsAverage.value),
        landmarkCount: landmarks.length,
        eyeDistance: measurement.eyeDistance / dpr,
        rotationDeg: (transform.angle * 180) / Math.PI,
        yawDeg: (transform.yaw * 180) / Math.PI,
        pitchDeg: (transform.pitch * 180) / Math.PI,
        scale: transform.width / Math.max(measurement.eyeDistance, 1),
        latencyMs: latencyAverage.value,
      };

      if (now - lastPush > STATE_PUSH_INTERVAL_MS) {
        lastPush = now;
        setFaceStatus(pendingStatus);
        setDetectedFaceShape(pendingFaceShape);
        if (opts.debug) setMetrics(pendingMetrics);
      }
    };

    // A separate slow ticker publishes status even when the loop returns early
    // (no face / multiple faces), without touching React inside the hot path.
    const statusTicker = window.setInterval(() => {
      setFaceStatus(pendingStatus);
      setDetectedFaceShape(pendingFaceShape);
      if (optionsRef.current.debug) {
        setMetrics({ ...pendingMetrics, fps: Math.round(fpsAverage.value) });
      }
    }, STATE_PUSH_INTERVAL_MS);

    frameId = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearInterval(statusTicker);
      positionerRef.current.reset();
      shapeEstimatorRef.current.reset();
      lastTimestampRef.current = -1;
    };
  }, [enabled]);

  /** Composites the live frame + the glasses overlay into a PNG data URL. */
  const capturePhoto = useCallback((): string | null => {
    const opts = optionsRef.current;
    const video = opts.videoRef.current;
    const overlay = opts.canvasRef.current;
    if (!video || !overlay || !video.videoWidth) return null;

    const out = document.createElement("canvas");
    out.width = overlay.width;
    out.height = overlay.height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    const { drawWidth, drawHeight, offsetX, offsetY } = coverTransform({
      canvasWidth: out.width,
      canvasHeight: out.height,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      mirrored: opts.mirrored,
    });

    ctx.save();
    if (opts.mirrored) {
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();

    const image = imageCacheRef.current.get(opts.product.image);
    if (image?.complete) {
      drawGlasses(ctx, image, positionerRef.current.value, opts.product);
    }
    return out.toDataURL("image/png");
  }, []);

  return { faceStatus, metrics, detectedFaceShape, capturePhoto };
}
