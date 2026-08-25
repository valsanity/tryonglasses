/**
 * Product catalog — pure data, zero UI/tracking coupling.
 * Swap `localProductRepository` in productRepository.ts for a REST/Supabase
 * implementation later without touching a single component or the face engine.
 *
 * The calibration numbers (scaleMultiplier / offsetX / offsetY) were derived
 * automatically from each PNG's lens-hole centroids by `tools/build_frames.py`,
 * and can be fine-tuned live in the Calibration Studio (debug mode).
 */
export interface GlassesProduct {
  id: string;
  sku: string;
  name: string;
  /** Path to a transparent-background asset (PNG). Never a white background. */
  image: string;
  price: number;
  color: string;
  size: string;
  /** Physical frame width in mm (reference only, for the future admin dashboard). */
  width: number;
  /** Physical frame height in mm. */
  height: number;
  /** Physical bridge width in mm. */
  bridgeWidth: number;
  /** Rendered glasses width = interpupillary distance (px) * scaleMultiplier. */
  scaleMultiplier: number;
  /** Horizontal nudge, as a fraction of the rendered glasses width. */
  offsetX: number;
  /** Vertical nudge, as a fraction of the rendered glasses width. Positive = down. */
  offsetY: number;
  /** Extra roll rotation in degrees applied on top of the measured head roll. */
  rotationOffset: number;
  /** Overlay opacity 0..1. */
  opacity: number;
}

export const PRODUCTS: GlassesProduct[] = [
  {
    id: "frame-001",
    sku: "OSB-001",
    name: "Classic Black",
    image: "/glasses/classic-black.png",
    price: 350000,
    color: "Hitam Glossy",
    size: "Medium",
    width: 140,
    height: 45,
    bridgeWidth: 18,
    scaleMultiplier: 2.5501,
    offsetX: -0.0004,
    offsetY: 0.0525,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-002",
    sku: "OSB-002",
    name: "Classic Brown",
    image: "/glasses/classic-brown.png",
    price: 350000,
    color: "Tortoise Brown",
    size: "Large",
    width: 146,
    height: 48,
    bridgeWidth: 19,
    scaleMultiplier: 2.0571,
    offsetX: 0.001,
    offsetY: 0.0009,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-003",
    sku: "OSB-003",
    name: "Round Black",
    image: "/glasses/round-black.png",
    price: 375000,
    color: "Matte Black",
    size: "Small",
    width: 136,
    height: 47,
    bridgeWidth: 21,
    scaleMultiplier: 2.6426,
    offsetX: 0.0008,
    offsetY: 0.0494,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-004",
    sku: "OSB-004",
    name: "Round Gold",
    image: "/glasses/round-gold.png",
    price: 400000,
    color: "Champagne Gold",
    size: "Small",
    width: 137,
    height: 47,
    bridgeWidth: 20,
    scaleMultiplier: 2.5183,
    offsetX: 0.0007,
    offsetY: 0.0426,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-005",
    sku: "OSB-005",
    name: "Square Black",
    image: "/glasses/square-black.png",
    price: 400000,
    color: "Deep Black",
    size: "Large",
    width: 148,
    height: 50,
    bridgeWidth: 17,
    scaleMultiplier: 2.242,
    offsetX: 0.0007,
    offsetY: 0.0327,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-006",
    sku: "OSB-006",
    name: "Clear Frame",
    image: "/glasses/clear-frame.png",
    price: 425000,
    color: "Frosted Crystal",
    size: "Medium",
    width: 142,
    height: 46,
    bridgeWidth: 19,
    scaleMultiplier: 2.4121,
    offsetX: 0.0042,
    offsetY: 0.0343,
    rotationOffset: 0,
    opacity: 1,
  },
];
