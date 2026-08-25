import type { GlassesProduct } from "@/data/products";

/**
 * Hand-written mirror of backend/models/frame.py.
 * Change one side, change the other in the same edit.
 */
export interface FrameDto {
  id: string;
  sku: string;
  name: string;
  price: number;
  color: string;
  size: string;
  stock: number;
  width: number;
  height: number;
  bridge_width: number;
  scale_multiplier: number;
  offset_x: number;
  offset_y: number;
  rotation_offset: number;
  opacity: number;
  active: boolean;
  sort_order: number;
  has_image: boolean;
  image_version: number;
  auto_calibrated: boolean;
}

/** Mirror of ImageProcessResult. */
export interface ImageProcessResult {
  frame: FrameDto;
  lens_holes_found: number;
  auto_calibrated: boolean;
  warning: string | null;
}

/** Mirror of AdminSession. */
export interface AdminSession {
  authenticated: boolean;
}

/** Mirror of FrameCreate / FrameUpdate payloads. */
export interface FramePayload {
  sku?: string;
  name?: string;
  price?: number;
  color?: string;
  size?: string;
  stock?: number;
  width?: number;
  height?: number;
  bridge_width?: number;
  scale_multiplier?: number;
  offset_x?: number;
  offset_y?: number;
  rotation_offset?: number;
  opacity?: number;
  active?: boolean;
}

export function frameImageUrl(frame: FrameDto): string {
  return frame.has_image ? `/api/frames/${frame.id}/image?v=${frame.image_version}` : "";
}

/** Adapts a database frame to the shape the tracking engine already consumes. */
export function frameToProduct(frame: FrameDto): GlassesProduct {
  return {
    id: frame.id,
    sku: frame.sku,
    name: frame.name,
    image: frameImageUrl(frame),
    price: frame.price,
    color: frame.color,
    size: frame.size,
    width: frame.width,
    height: frame.height,
    bridgeWidth: frame.bridge_width,
    scaleMultiplier: frame.scale_multiplier,
    offsetX: frame.offset_x,
    offsetY: frame.offset_y,
    rotationOffset: frame.rotation_offset,
    opacity: frame.opacity,
  };
}
