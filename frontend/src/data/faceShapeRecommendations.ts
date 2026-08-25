import type { FaceShapeId } from "@/lib/vto/faceShape";

/**
 * Styling advice per face shape — pure data, decoupled from both the UI and the
 * tracking engine, so it can move to a CMS/DB later like the catalog itself.
 */
export interface FaceShapeAdvice {
  /** SKUs that flatter this face shape, best match first. */
  recommendedSkus: string[];
  /** One-line reason shown in the catalog sheet. */
  advice: string;
}

export const FACE_SHAPE_ADVICE: Record<FaceShapeId, FaceShapeAdvice> = {
  oval: {
    recommendedSkus: ["OSB-001", "OSB-004", "OSB-006"],
    advice: "Wajah oval seimbang — hampir semua bentuk frame cocok. Pilih sesuai selera Anda.",
  },
  bulat: {
    recommendedSkus: ["OSB-005", "OSB-001", "OSB-002"],
    advice: "Frame bersudut tegas memberi struktur dan membuat wajah bulat terlihat lebih tirus.",
  },
  kotak: {
    recommendedSkus: ["OSB-003", "OSB-004", "OSB-006"],
    advice: "Frame bulat dan tipis melembutkan garis rahang yang tegas.",
  },
  hati: {
    recommendedSkus: ["OSB-003", "OSB-004", "OSB-006"],
    advice: "Frame ringan dan membulat menyeimbangkan dahi yang lebih lebar dari dagu.",
  },
  panjang: {
    recommendedSkus: ["OSB-005", "OSB-002", "OSB-001"],
    advice: "Frame tebal dan lebar memberi kesan wajah lebih pendek dan proporsional.",
  },
  diamond: {
    recommendedSkus: ["OSB-003", "OSB-004", "OSB-001"],
    advice: "Frame membulat dengan garis atas jelas menonjolkan tulang pipi Anda.",
  },
};

export function isRecommendedFrame(shape: FaceShapeId | null, sku: string): boolean {
  if (!shape) return false;
  return FACE_SHAPE_ADVICE[shape].recommendedSkus.includes(sku);
}

/** Recommended frames first (best match first), everything else after. */
export function sortByRecommendation<T extends { sku: string }>(
  products: T[],
  shape: FaceShapeId | null,
): T[] {
  if (!shape) return products;
  const order = FACE_SHAPE_ADVICE[shape].recommendedSkus;
  return [...products].sort((a, b) => {
    const rankA = order.indexOf(a.sku);
    const rankB = order.indexOf(b.sku);
    const scoreA = rankA === -1 ? order.length : rankA;
    const scoreB = rankB === -1 ? order.length : rankB;
    return scoreA - scoreB;
  });
}

/** How many catalog frames actually match this shape right now. */
export function countMatches(shape: FaceShapeId, skus: string[]): number {
  return FACE_SHAPE_ADVICE[shape].recommendedSkus.filter((sku) => skus.includes(sku)).length;
}
