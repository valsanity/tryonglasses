"""
Background removal + automatic try-on calibration for uploaded frame photos.

An admin uploads a product shot (white backdrop, table, or an already
transparent PNG). We produce a transparent PNG on a 600px-wide canvas and
derive the calibration from the two lens openings, matching the renderer
contract in frontend/src/lib/vto/glassesPosition.ts:

    renderedWidth = eyeDistance * scale_multiplier
    scale_multiplier = CANVAS_W / lensCentreDistance
    offset_x         = (CANVAS_W/2 - lensCentreX) / CANVAS_W
    offset_y         = (height/2   - lensCentreY) / CANVAS_W
"""

from __future__ import annotations

from collections import deque
from io import BytesIO
from typing import NamedTuple

import numpy as np
from PIL import Image

CANVAS_W = 600
# Colour distance (0-441) at which a pixel is considered fully background.
BG_TOLERANCE_LOW = 26.0
BG_TOLERANCE_HIGH = 62.0
# Enclosed transparent regions at least this big are lens openings, not
# specular highlights on the frame itself.
MIN_LENS_AREA = 220


class Calibration(NamedTuple):
    scale_multiplier: float
    offset_x: float
    offset_y: float
    lens_holes: int


def _estimate_background(rgb: np.ndarray) -> np.ndarray:
    """Median colour of an 8px border band — the backdrop, not the product."""
    band = 8
    edges = np.concatenate(
        [
            rgb[:band].reshape(-1, 3),
            rgb[-band:].reshape(-1, 3),
            rgb[:, :band].reshape(-1, 3),
            rgb[:, -band:].reshape(-1, 3),
        ]
    )
    return np.median(edges, axis=0)


def _components(mask: np.ndarray) -> list[tuple[list[tuple[int, int]], bool]]:
    """
    Labels every True region in `mask` with 4-connectivity.
    Returns (pixels, touches_border) per region.
    """
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    regions: list[tuple[list[tuple[int, int]], bool]] = []

    for sy in range(height):
        for sx in range(width):
            if not mask[sy, sx] or visited[sy, sx]:
                continue
            queue = deque([(sy, sx)])
            visited[sy, sx] = True
            pixels: list[tuple[int, int]] = []
            touches = False
            while queue:
                y, x = queue.popleft()
                pixels.append((y, x))
                if y == 0 or x == 0 or y == height - 1 or x == width - 1:
                    touches = True
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < height and 0 <= nx < width:
                        if mask[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            queue.append((ny, nx))
            regions.append((pixels, touches))
    return regions


def _alpha_from_background(image: Image.Image) -> np.ndarray:
    """Soft alpha from colour distance to the estimated backdrop colour."""
    rgb = np.asarray(image.convert("RGB")).astype(np.float32)
    background = _estimate_background(rgb)
    distance = np.sqrt(((rgb - background) ** 2).sum(axis=2))
    ramp = (distance - BG_TOLERANCE_LOW) / (BG_TOLERANCE_HIGH - BG_TOLERANCE_LOW)
    return np.clip(ramp, 0.0, 1.0) * 255.0


def process_frame_image(data: bytes) -> tuple[bytes, Calibration, str | None]:
    """
    Returns (png_bytes, calibration, warning).
    Honours an existing alpha channel instead of re-keying a transparent PNG.
    """
    source = Image.open(BytesIO(data))
    source = source.convert("RGBA") if source.mode in ("RGBA", "LA", "P") else source.convert("RGB")

    warning: str | None = None

    if source.mode == "RGBA" and np.asarray(source)[:, :, 3].min() < 250:
        rgba = np.asarray(source).astype(np.float32)
    else:
        rgb = np.asarray(source.convert("RGB")).astype(np.float32)
        rgba = np.dstack([rgb, _alpha_from_background(source)])

    # Crop to the product.
    solid = rgba[:, :, 3] > 40
    rows = np.where(solid.any(axis=1))[0]
    cols = np.where(solid.any(axis=0))[0]
    if rows.size == 0 or cols.size == 0:
        raise ValueError(
            "Latar belakang tidak bisa dipisahkan dari frame. Coba foto dengan latar "
            "polos yang kontras (misal frame hitam di atas kertas putih)."
        )
    pad = 2
    y0, y1 = max(int(rows[0]) - pad, 0), min(int(rows[-1]) + 1 + pad, rgba.shape[0])
    x0, x1 = max(int(cols[0]) - pad, 0), min(int(cols[-1]) + 1 + pad, rgba.shape[1])
    cropped = np.clip(rgba[y0:y1, x0:x1], 0, 255).astype(np.uint8)

    image = Image.fromarray(cropped, mode="RGBA")
    height = max(1, round(image.height * CANVAS_W / image.width))
    image = image.resize((CANVAS_W, height), Image.LANCZOS)

    # Classify transparent regions on the final canvas.
    array = np.array(image)
    alpha = array[:, :, 3]
    holes: list[tuple[float, float, int]] = []
    for pixels, touches_border in _components(alpha < 40):
        if touches_border:
            continue  # the backdrop itself
        if len(pixels) < MIN_LENS_AREA:
            # A highlight on the frame, not a lens opening — make it solid again.
            for y, x in pixels:
                alpha[y, x] = 255
            continue
        ys = np.fromiter((p[0] for p in pixels), dtype=np.float32, count=len(pixels))
        xs = np.fromiter((p[1] for p in pixels), dtype=np.float32, count=len(pixels))
        holes.append((float(xs.mean()), float(ys.mean()), len(pixels)))

    array[:, :, 3] = alpha
    image = Image.fromarray(array, mode="RGBA")

    holes.sort(key=lambda item: item[2], reverse=True)
    if len(holes) >= 2:
        left, right = sorted(holes[:2], key=lambda item: item[0])
        lens_distance = right[0] - left[0]
        centre_x = (left[0] + right[0]) / 2
        centre_y = (left[1] + right[1]) / 2
        calibration = Calibration(
            scale_multiplier=round(CANVAS_W / max(lens_distance, 1.0), 4),
            offset_x=round((CANVAS_W / 2 - centre_x) / CANVAS_W, 4),
            offset_y=round((height / 2 - centre_y) / CANVAS_W, 4),
            lens_holes=2,
        )
    else:
        calibration = Calibration(2.5, 0.0, 0.0, len(holes))
        warning = (
            "Lubang lensa tidak terdeteksi otomatis, jadi kalibrasi memakai nilai "
            "standar. Silakan setel slider secara manual."
        )

    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue(), calibration, warning
