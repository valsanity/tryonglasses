import type { NormalizedLandmark, Matrix } from "@mediapipe/tasks-vision";
import { clamp } from "@/lib/vto/smoothing";

/**
 * Pure face-tracking math. No React, no canvas, no DOM — this is the engine
 * layer and is deliberately independent of the UI.
 */

/** MediaPipe Face Mesh landmark indices we anchor on. */
export const LANDMARKS = {
  leftIris: 468,
  rightIris: 473,
  leftEyeInner: 133,
  leftEyeOuter: 33,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  noseBridge: 168,
  noseTip: 1,
  leftTemple: 127,
  rightTemple: 356,
  chin: 152,
  forehead: 10,
} as const;

export interface Point2D {
  x: number;
  y: number;
}

/** Maps normalized landmarks (0..1 of the video frame) into canvas pixels. */
export interface ViewportTransform {
  canvasWidth: number;
  canvasHeight: number;
  videoWidth: number;
  videoHeight: number;
  mirrored: boolean;
}

/**
 * Replicates CSS `object-fit: cover`: the video is scaled up until it covers the
 * canvas box and the overflow is cropped evenly. Landmark coordinates MUST go
 * through this — CSS percentages would drift as soon as the camera aspect ratio
 * differs from the viewport aspect ratio.
 */
export function coverTransform(t: ViewportTransform) {
  const scale = Math.max(t.canvasWidth / t.videoWidth, t.canvasHeight / t.videoHeight);
  const drawWidth = t.videoWidth * scale;
  const drawHeight = t.videoHeight * scale;
  return {
    scale,
    drawWidth,
    drawHeight,
    offsetX: (t.canvasWidth - drawWidth) / 2,
    offsetY: (t.canvasHeight - drawHeight) / 2,
  };
}

export function toCanvasPoint(landmark: NormalizedLandmark, t: ViewportTransform): Point2D {
  const { scale, offsetX, offsetY } = coverTransform(t);
  const x = offsetX + landmark.x * t.videoWidth * scale;
  const y = offsetY + landmark.y * t.videoHeight * scale;
  return { x: t.mirrored ? t.canvasWidth - x : x, y };
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Head orientation in radians, derived from MediaPipe's 4x4 transform matrix. */
export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

/**
 * MediaPipe hands back a column-major 4x4 matrix. Index = column * 4 + row.
 * Returns null when `outputFacialTransformationMatrixes` produced nothing.
 */
export function decomposeHeadPose(matrix: Matrix | undefined): HeadPose | null {
  if (!matrix || !matrix.data || matrix.data.length < 16) return null;
  const d = matrix.data;
  const r00 = d[0];
  const r10 = d[1];
  const r02 = d[8];
  const r12 = d[9];
  const r22 = d[10];
  const yaw = Math.atan2(r02, r22);
  const pitch = Math.atan2(-r12, Math.hypot(r02, r22));
  const roll = Math.atan2(r10, r00);
  return { yaw, pitch, roll };
}

/** Everything the renderer needs, measured from one frame of landmarks. */
export interface FaceMeasurement {
  /** Midpoint between the two eye anchors, in canvas px. */
  eyeCenter: Point2D;
  /** Nose bridge landmark, in canvas px. */
  noseBridge: Point2D;
  /** Interpupillary distance in canvas px — the scaling basis. */
  eyeDistance: number;
  /** Roll of the eye line in radians (screen space, mirror-corrected). */
  roll: number;
  /** Yaw in radians: negative = turned to the viewer's left. */
  yaw: number;
  /** Pitch in radians: negative = looking down. */
  pitch: number;
}

function pick(
  landmarks: NormalizedLandmark[],
  primary: number,
  fallbackA: number,
  fallbackB: number,
  t: ViewportTransform,
): Point2D {
  const lm = landmarks[primary];
  if (lm) return toCanvasPoint(lm, t);
  // Iris landmarks (468+) are absent if the model was built without refinement.
  const a = toCanvasPoint(landmarks[fallbackA], t);
  const b = toCanvasPoint(landmarks[fallbackB], t);
  return midpoint(a, b);
}

export function measureFace(
  landmarks: NormalizedLandmark[],
  matrix: Matrix | undefined,
  t: ViewportTransform,
): FaceMeasurement | null {
  if (!landmarks || landmarks.length < 468) return null;

  const leftEye = pick(landmarks, LANDMARKS.leftIris, LANDMARKS.leftEyeOuter, LANDMARKS.leftEyeInner, t);
  const rightEye = pick(landmarks, LANDMARKS.rightIris, LANDMARKS.rightEyeOuter, LANDMARKS.rightEyeInner, t);
  const noseBridge = toCanvasPoint(landmarks[LANDMARKS.noseBridge], t);

  const eyeDistance = distance(leftEye, rightEye);
  if (!Number.isFinite(eyeDistance) || eyeDistance < 4) return null;

  // Screen-space roll straight off the eye line (already mirror-corrected).
  // Order the anchors left-to-right on screen so the angle never wraps by pi.
  const [a, b] = leftEye.x <= rightEye.x ? [leftEye, rightEye] : [rightEye, leftEye];
  const roll = Math.atan2(b.y - a.y, b.x - a.x);

  const pose = decomposeHeadPose(matrix);
  let yaw: number;
  let pitch: number;
  if (pose) {
    yaw = t.mirrored ? -pose.yaw : pose.yaw;
    pitch = pose.pitch;
  } else {
    // Landmark-only fallback: how far the nose bridge sits off the eye midpoint.
    const center = midpoint(leftEye, rightEye);
    yaw = clamp(((noseBridge.x - center.x) / (eyeDistance * 0.5)) * 0.9, -1.2, 1.2);
    const faceHeight = distance(
      toCanvasPoint(landmarks[LANDMARKS.forehead], t),
      toCanvasPoint(landmarks[LANDMARKS.chin], t),
    );
    pitch = clamp(((noseBridge.y - center.y) / Math.max(faceHeight, 1) - 0.08) * 4, -1.2, 1.2);
  }

  return {
    eyeCenter: midpoint(leftEye, rightEye),
    noseBridge,
    eyeDistance,
    roll,
    yaw: clamp(yaw, -1.4, 1.4),
    pitch: clamp(pitch, -1.4, 1.4),
  };
}
