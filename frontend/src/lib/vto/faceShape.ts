import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { ViewportTransform } from "@/lib/vto/faceTracking";
import { distance, toCanvasPoint } from "@/lib/vto/faceTracking";
import { RollingAverage } from "@/lib/vto/smoothing";

/** Face shapes we classify, in Indonesian (the UI language). */
export type FaceShapeId = "oval" | "bulat" | "kotak" | "hati" | "panjang" | "diamond";

export const FACE_SHAPE_IDS: FaceShapeId[] = ["oval", "bulat", "kotak", "hati", "panjang", "diamond"];

export const FACE_SHAPE_LABELS: Record<FaceShapeId, string> = {
  oval: "Oval",
  bulat: "Bulat",
  kotak: "Kotak",
  hati: "Hati",
  panjang: "Panjang",
  diamond: "Diamond",
};

/** Contour landmarks used for the proportion measurements. */
const SHAPE_LANDMARKS = {
  cheekLeft: 234,
  cheekRight: 454,
  jawLeft: 172,
  jawRight: 397,
  foreheadLeft: 103,
  foreheadRight: 332,
  chin: 152,
  foreheadTop: 10,
} as const;

export interface FaceShapeMetrics {
  /** Face height / cheekbone width. */
  widthHeight: number;
  /** Jaw width / cheekbone width — how much the jaw tapers. */
  jawCheek: number;
  /** Forehead width / cheekbone width. */
  foreheadCheek: number;
  /** Angle at the chin in degrees — low = pointed chin, high = square jaw. */
  jawAngleDeg: number;
}

/**
 * Measures face proportions from the contour landmarks.
 * Returns null while the head is turned or tilted too far, because
 * foreshortening would corrupt every ratio.
 */
export function measureFaceShapeMetrics(
  landmarks: NormalizedLandmark[],
  viewport: ViewportTransform,
  yaw: number,
  pitch: number,
): FaceShapeMetrics | null {
  if (!landmarks || landmarks.length < 468) return null;
  if (Math.abs(yaw) > 0.22 || Math.abs(pitch) > 0.26) return null;

  const p = (index: number) => toCanvasPoint(landmarks[index], viewport);
  const cheekLeft = p(SHAPE_LANDMARKS.cheekLeft);
  const cheekRight = p(SHAPE_LANDMARKS.cheekRight);
  const jawLeft = p(SHAPE_LANDMARKS.jawLeft);
  const jawRight = p(SHAPE_LANDMARKS.jawRight);
  const foreheadLeft = p(SHAPE_LANDMARKS.foreheadLeft);
  const foreheadRight = p(SHAPE_LANDMARKS.foreheadRight);
  const chin = p(SHAPE_LANDMARKS.chin);
  const foreheadTop = p(SHAPE_LANDMARKS.foreheadTop);

  const cheekWidth = distance(cheekLeft, cheekRight);
  const faceHeight = distance(foreheadTop, chin);
  if (cheekWidth < 8 || faceHeight < 8) return null;

  const jawWidth = distance(jawLeft, jawRight);
  const foreheadWidth = distance(foreheadLeft, foreheadRight);

  // Interior angle at the chin between the two jaw lines.
  const a = Math.hypot(jawLeft.x - chin.x, jawLeft.y - chin.y);
  const b = Math.hypot(jawRight.x - chin.x, jawRight.y - chin.y);
  const c = jawWidth;
  const cosChin = (a * a + b * b - c * c) / (2 * a * b || 1);
  const jawAngleDeg = (Math.acos(Math.min(1, Math.max(-1, cosChin))) * 180) / Math.PI;

  return {
    widthHeight: faceHeight / cheekWidth,
    jawCheek: jawWidth / cheekWidth,
    foreheadCheek: foreheadWidth / cheekWidth,
    jawAngleDeg,
  };
}

/**
 * Rule-based classifier over the measured proportions.
 * Kept pure and separate from the UI so the thresholds can be tuned with the
 * live values shown in debug mode.
 */
export function classifyFaceShape(m: FaceShapeMetrics): FaceShapeId {
  const { widthHeight, jawCheek, foreheadCheek } = m;

  // Clearly longer than wide.
  if (widthHeight >= 1.52) return "panjang";

  // Clearly as wide as it is tall: round vs square decided by the jaw.
  if (widthHeight <= 1.22) return jawCheek >= 0.82 ? "kotak" : "bulat";

  // Mid-length faces: read the taper.
  if (foreheadCheek >= 0.96 && jawCheek <= 0.78) return "hati";
  if (foreheadCheek <= 0.9 && jawCheek <= 0.8) return "diamond";
  if (jawCheek >= 0.88) return "kotak";
  return "oval";
}

const MIN_SAMPLES = 18;

/**
 * Averages the ratios over many frames before classifying, so the reported
 * shape does not flicker between neighbouring categories.
 */
export class FaceShapeEstimator {
  private widthHeight = new RollingAverage(45);
  private jawCheek = new RollingAverage(45);
  private foreheadCheek = new RollingAverage(45);
  private jawAngle = new RollingAverage(45);
  private samples = 0;

  reset(): void {
    this.widthHeight = new RollingAverage(45);
    this.jawCheek = new RollingAverage(45);
    this.foreheadCheek = new RollingAverage(45);
    this.jawAngle = new RollingAverage(45);
    this.samples = 0;
  }

  push(metrics: FaceShapeMetrics): void {
    this.widthHeight.push(metrics.widthHeight);
    this.jawCheek.push(metrics.jawCheek);
    this.foreheadCheek.push(metrics.foreheadCheek);
    this.jawAngle.push(metrics.jawAngleDeg);
    this.samples += 1;
  }

  /** null until enough steady frames have been collected. */
  get result(): { shape: FaceShapeId; metrics: FaceShapeMetrics } | null {
    if (this.samples < MIN_SAMPLES) return null;
    const metrics: FaceShapeMetrics = {
      widthHeight: this.widthHeight.value,
      jawCheek: this.jawCheek.value,
      foreheadCheek: this.foreheadCheek.value,
      jawAngleDeg: this.jawAngle.value,
    };
    return { shape: classifyFaceShape(metrics), metrics };
  }

  get sampleCount(): number {
    return this.samples;
  }
}
