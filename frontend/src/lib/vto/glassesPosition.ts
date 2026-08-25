import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { GlassesProduct } from "@/data/products";
import type { FaceMeasurement, ViewportTransform } from "@/lib/vto/faceTracking";
import { LANDMARKS, toCanvasPoint } from "@/lib/vto/faceTracking";
import { clamp, lerp, lerpAngle } from "@/lib/vto/smoothing";

export interface GlassesTransform {
  /** Anchor in canvas px (rotation pivot, roughly the nose bridge). */
  x: number;
  y: number;
  /** Rendered frame width in canvas px. */
  width: number;
  /** Roll in radians. */
  angle: number;
  yaw: number;
  pitch: number;
  /** 0..1 fade so the overlay never pops in/out. */
  presence: number;
}

const IDENTITY: GlassesTransform = {
  x: 0,
  y: 0,
  width: 0,
  angle: 0,
  yaw: 0,
  pitch: 0,
  presence: 0,
};

/**
 * Holds the smoothed frame transform between animation frames.
 * Deliberately mutable and outside React state — it updates ~30-60x/second.
 */
export class GlassesPositioner {
  private current: GlassesTransform = { ...IDENTITY };
  private initialized = false;

  reset(): void {
    this.current = { ...IDENTITY };
    this.initialized = false;
  }

  /** Fades the overlay out while no face is measured. */
  decay(smoothingFactor: number): GlassesTransform {
    this.current.presence = lerp(this.current.presence, 0, smoothingFactor);
    if (this.current.presence < 0.01) this.initialized = false;
    return this.current;
  }

  update(
    measurement: FaceMeasurement,
    product: GlassesProduct,
    smoothingFactor: number,
  ): GlassesTransform {
    const width = measurement.eyeDistance * product.scaleMultiplier;

    // Anchor: mostly the nose bridge horizontally (it tracks yaw), mostly the
    // eye line vertically (lens centres belong at eye height).
    const targetX = measurement.eyeCenter.x * 0.35 + measurement.noseBridge.x * 0.65;
    const targetY = measurement.eyeCenter.y * 0.78 + measurement.noseBridge.y * 0.22;

    const target: GlassesTransform = {
      x: targetX,
      y: targetY,
      width,
      angle: measurement.roll + (product.rotationOffset * Math.PI) / 180,
      yaw: measurement.yaw,
      pitch: measurement.pitch,
      presence: 1,
    };

    if (!this.initialized) {
      this.current = { ...target, presence: 0.35 };
      this.initialized = true;
      return this.current;
    }

    const f = clamp(smoothingFactor, 0.05, 1);
    this.current = {
      x: lerp(this.current.x, target.x, f),
      y: lerp(this.current.y, target.y, f),
      width: lerp(this.current.width, target.width, f),
      angle: lerpAngle(this.current.angle, target.angle, f),
      yaw: lerp(this.current.yaw, target.yaw, f),
      pitch: lerp(this.current.pitch, target.pitch, f),
      presence: lerp(this.current.presence, 1, f),
    };
    return this.current;
  }

  get value(): GlassesTransform {
    return this.current;
  }
}

/**
 * Draws the frame asset with position / scale / roll / a cheap perspective
 * squeeze for yaw. Architected so a full 3D pose renderer can replace only this
 * function later — the measurement and smoothing layers stay untouched.
 */
export function drawGlasses(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  transform: GlassesTransform,
  product: GlassesProduct,
): void {
  if (transform.presence <= 0.01 || transform.width <= 0) return;
  const naturalWidth = image.naturalWidth || 600;
  const naturalHeight = image.naturalHeight || 220;
  const width = transform.width;
  const height = width * (naturalHeight / naturalWidth);

  // Yaw squeezes the frame horizontally and slides it toward the visible side,
  // which is what makes a 2D asset read as "still on the face" when turning.
  const yawSqueeze = clamp(Math.cos(transform.yaw), 0.42, 1);
  const yawShift = Math.sin(transform.yaw) * width * 0.06;
  const pitchShift = Math.sin(transform.pitch) * height * 0.28;

  ctx.save();
  ctx.globalAlpha = product.opacity * clamp(transform.presence, 0, 1);
  ctx.translate(transform.x + product.offsetX * width, transform.y + product.offsetY * width);
  ctx.rotate(transform.angle);
  ctx.translate(yawShift, pitchShift);
  ctx.scale(yawSqueeze, 1);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

const DEBUG_MESH_STEP = 4;

/** Landmark mesh + anchors, drawn only while debug mode is on. */
export function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  measurement: FaceMeasurement,
  viewport: ViewportTransform,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(0, 255, 102, 0.55)";
  for (let i = 0; i < landmarks.length; i += DEBUG_MESH_STEP) {
    const p = toCanvasPoint(landmarks[i], viewport);
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  }

  const anchors: Array<{ index: number; color: string; label: string }> = [
    { index: LANDMARKS.leftIris, color: "#38BDF8", label: "L" },
    { index: LANDMARKS.rightIris, color: "#F472B6", label: "R" },
    { index: LANDMARKS.noseBridge, color: "#FACC15", label: "N" },
  ];
  ctx.font = "600 12px monospace";
  for (const anchor of anchors) {
    const lm = landmarks[anchor.index];
    if (!lm) continue;
    const p = toCanvasPoint(lm, viewport);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.strokeStyle = anchor.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = anchor.color;
    ctx.fillText(anchor.label, p.x + 9, p.y - 8);
  }

  ctx.beginPath();
  ctx.moveTo(measurement.eyeCenter.x - Math.cos(measurement.roll) * measurement.eyeDistance * 0.5,
    measurement.eyeCenter.y - Math.sin(measurement.roll) * measurement.eyeDistance * 0.5);
  ctx.lineTo(measurement.eyeCenter.x + Math.cos(measurement.roll) * measurement.eyeDistance * 0.5,
    measurement.eyeCenter.y + Math.sin(measurement.roll) * measurement.eyeDistance * 0.5);
  ctx.strokeStyle = "rgba(0,255,102,0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
