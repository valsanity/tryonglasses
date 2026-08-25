/**
 * Product catalog — pure data, zero UI/tracking coupling.
 * Swap `localProductRepository` in productRepository.ts for a REST/Supabase
 * implementation later without touching a single component or the face engine.
 */
export interface GlassesProduct {
  id: string;
  sku: string;
  name: string;
  /** Path to a transparent-background asset (SVG or PNG). Never a white background. */
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
  /** Overlay opacity 0..1 — clear/crystal frames read better slightly translucent. */
  opacity: number;
}

export const PRODUCTS: GlassesProduct[] = [
  {
    id: "frame-001",
    sku: "OSB-001",
    name: "Classic Black",
    image: "/glasses/classic-black.svg",
    price: 350000,
    color: "Hitam Glossy",
    size: "Medium",
    width: 140,
    height: 45,
    bridgeWidth: 18,
    scaleMultiplier: 2.5,
    offsetX: 0,
    offsetY: 0.01,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-002",
    sku: "OSB-002",
    name: "Classic Brown",
    image: "/glasses/classic-brown.svg",
    price: 350000,
    color: "Tortoise Brown",
    size: "Medium",
    width: 141,
    height: 45,
    bridgeWidth: 19,
    scaleMultiplier: 2.52,
    offsetX: 0,
    offsetY: 0.01,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-003",
    sku: "OSB-003",
    name: "Round Black",
    image: "/glasses/round-black.svg",
    price: 375000,
    color: "Matte Black",
    size: "Small",
    width: 136,
    height: 47,
    bridgeWidth: 21,
    scaleMultiplier: 2.42,
    offsetX: 0,
    offsetY: 0.005,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-004",
    sku: "OSB-004",
    name: "Round Gold",
    image: "/glasses/round-gold.svg",
    price: 400000,
    color: "Champagne Gold",
    size: "Small",
    width: 137,
    height: 47,
    bridgeWidth: 20,
    scaleMultiplier: 2.42,
    offsetX: 0,
    offsetY: 0.005,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-005",
    sku: "OSB-005",
    name: "Square Black",
    image: "/glasses/square-black.svg",
    price: 400000,
    color: "Deep Black",
    size: "Large",
    width: 146,
    height: 48,
    bridgeWidth: 17,
    scaleMultiplier: 2.62,
    offsetX: 0,
    offsetY: 0.012,
    rotationOffset: 0,
    opacity: 1,
  },
  {
    id: "frame-006",
    sku: "OSB-006",
    name: "Clear Frame",
    image: "/glasses/clear-frame.svg",
    price: 425000,
    color: "Crystal Clear",
    size: "Medium",
    width: 140,
    height: 45,
    bridgeWidth: 19,
    scaleMultiplier: 2.5,
    offsetX: 0,
    offsetY: 0.01,
    rotationOffset: 0,
    opacity: 0.92,
  },
];
