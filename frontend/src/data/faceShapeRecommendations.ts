import type { FaceShapeId } from "@/lib/vto/faceShape";

/**
 * Styling advice per face shape — pure data, decoupled from both the UI and the
 * tracking engine, so it can move to a CMS/DB later like the catalog itself.
 */
export interface FaceShapeAdvice {
  /** Product ids that flatter this face shape, best match first. */
  recommendedFrameIds: string[];
  /** One-line reason shown in the catalog sheet. */
  advice: string;
}

export const FACE_SHAPE_ADVICE: Record<FaceShapeId, FaceShapeAdvice> = {
  oval: {
    recommendedFrameIds: ["frame-001", "frame-004", "frame-006"],
    advice: "Wajah oval seimbang — hampir semua bentuk frame cocok. Pilih sesuai selera Anda.",
  },
  bulat: {
    recommendedFrameIds: ["frame-005", "frame-001", "frame-002"],
    advice: "Frame bersudut tegas memberi struktur dan membuat wajah bulat terlihat lebih tirus.",
  },
  kotak: {
    recommendedFrameIds: ["frame-003", "frame-004", "frame-006"],
    advice: "Frame bulat dan tipis melembutkan garis rahang yang tegas.",
  },
  hati: {
    recommendedFrameIds: ["frame-003", "frame-004", "frame-006"],
    advice: "Frame ringan dan membulat menyeimbangkan dahi yang lebih lebar dari dagu.",
  },
  panjang: {
    recommendedFrameIds: ["frame-005", "frame-002", "frame-001"],
    advice: "Frame tebal dan lebar memberi kesan wajah lebih pendek dan proporsional.",
  },
  diamond: {
    recommendedFrameIds: ["frame-003", "frame-004", "frame-001"],
    advice: "Frame membulat dengan garis atas jelas menonjolkan tulang pipi Anda.",
  },
};

export function isRecommendedFrame(shape: FaceShapeId | null, frameId: string): boolean {
  if (!shape) return false;
  return FACE_SHAPE_ADVICE[shape].recommendedFrameIds.includes(frameId);
}

/** Recommended frames first (best match first), everything else after. */
export function sortByRecommendation<T extends { id: string }>(
  products: T[],
  shape: FaceShapeId | null,
): T[] {
  if (!shape) return products;
  const order = FACE_SHAPE_ADVICE[shape].recommendedFrameIds;
  return [...products].sort((a, b) => {
    const rankA = order.indexOf(a.id);
    const rankB = order.indexOf(b.id);
    const scoreA = rankA === -1 ? order.length : rankA;
    const scoreB = rankB === -1 ? order.length : rankB;
    return scoreA - scoreB;
  });
}
