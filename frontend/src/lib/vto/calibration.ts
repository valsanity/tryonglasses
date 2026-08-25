import type { GlassesProduct } from "@/data/products";

/**
 * Per-frame calibration overrides produced by the Calibration Studio.
 * Stored in localStorage only — uploaded images never leave the browser.
 */
export interface CalibrationOverride {
  scaleMultiplier?: number;
  offsetX?: number;
  offsetY?: number;
  rotationOffset?: number;
  opacity?: number;
}

export type CalibrationMap = Record<string, CalibrationOverride>;

const STORAGE_KEY = "osb.calibration.v1";

export const CALIBRATION_FIELDS = [
  { key: "scaleMultiplier", label: "Scale Multiplier", min: 1.4, max: 4, step: 0.01 },
  { key: "offsetX", label: "Offset X", min: -0.3, max: 0.3, step: 0.002 },
  { key: "offsetY", label: "Offset Y", min: -0.3, max: 0.3, step: 0.002 },
  { key: "rotationOffset", label: "Rotation Offset (°)", min: -20, max: 20, step: 0.5 },
  { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.01 },
] as const satisfies ReadonlyArray<{
  key: keyof CalibrationOverride;
  label: string;
  min: number;
  max: number;
  step: number;
}>;

export function loadCalibration(): CalibrationMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as CalibrationMap;
  } catch {
    return {};
  }
}

export function saveCalibration(map: CalibrationMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Private-mode / quota — calibration simply stays in memory this session.
  }
}

/** Merges an override (and an optional session-only image) onto a product. */
export function applyCalibration(
  product: GlassesProduct,
  overrides: CalibrationMap,
  imageOverride?: string,
): GlassesProduct {
  const override = overrides[product.id];
  if (!override && !imageOverride) return product;
  return {
    ...product,
    ...override,
    image: imageOverride ?? product.image,
  };
}

const NUMBER_FIELDS = ["scaleMultiplier", "offsetX", "offsetY", "rotationOffset", "opacity"] as const;

/** Emits a ready-to-paste `products.ts` fragment with the calibrated values. */
export function buildProductsSnippet(
  products: GlassesProduct[],
  overrides: CalibrationMap,
): string {
  const entries = products.map((base) => {
    const p = applyCalibration(base, overrides);
    const numbers = NUMBER_FIELDS.map((field) => `    ${field}: ${Number(p[field].toFixed(4))},`).join("\n");
    return [
      "  {",
      `    id: "${p.id}",`,
      `    sku: "${p.sku}",`,
      `    name: "${p.name}",`,
      `    image: "${p.image.startsWith("blob:") ? base.image : p.image}",`,
      `    price: ${p.price},`,
      `    color: "${p.color}",`,
      `    size: "${p.size}",`,
      `    width: ${p.width},`,
      `    height: ${p.height},`,
      `    bridgeWidth: ${p.bridgeWidth},`,
      numbers,
      "  },",
    ].join("\n");
  });
  return `export const PRODUCTS: GlassesProduct[] = [\n${entries.join("\n")}\n];\n`;
}
