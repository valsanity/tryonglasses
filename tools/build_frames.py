"""
Build transparent-PNG glasses assets from chroma-green product renders and
auto-derive each frame's calibration parameters.

Pipeline per image:
  1. chroma-key the green background to alpha (ratio test, so shadows key too)
  2. de-spill the residual green on soft edges
  3. crop to the frame bounding box
  4. flood-fill to find the two lens openings (enclosed transparent regions)
  5. resize to a 600px-wide canvas
  6. emit scaleMultiplier / offsetX / offsetY from the lens-hole centroids

Renderer contract (frontend/src/lib/vto/glassesPosition.ts):
  renderedWidth = eyeDistance * scaleMultiplier, image drawn centred on the
  anchor, then nudged by offsetX/offsetY (fractions of renderedWidth).
  So to land the lens centres exactly on the pupils:
      scaleMultiplier = CANVAS_W / lensCentreDistance
      offsetX         = (CANVAS_W/2 - lensCentreX) / CANVAS_W
      offsetY         = (height/2  - lensCentreY) / CANVAS_W

Run: cd /app && python tools/build_frames.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from collections import deque
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

CANVAS_W = 600
OUT_DIR = Path("/app/frontend/public/glasses")

SOURCES: dict[str, str] = {
    "classic-black": "https://static.prod-images.emergentagent.com/jobs/0ec9d1bd-8faa-4087-bf6b-71f9a075c8ee/images/bd1e8f6cf47dcb746fb30d5ae97cb655a1b810d6545700344b7d8cb4a108cec3.jpeg",
    "classic-brown": "https://static.prod-images.emergentagent.com/jobs/0ec9d1bd-8faa-4087-bf6b-71f9a075c8ee/images/d887660103c292c9f961470a7713dcb786a8aa827311b10b8953474053ab3a1b.jpeg",
    "round-black": "https://static.prod-images.emergentagent.com/jobs/0ec9d1bd-8faa-4087-bf6b-71f9a075c8ee/images/fbbc9cb47b65fbc27b0960d7fabce9f62ecca8c57e60a8c83d48e230ae42a2ad.jpeg",
    "round-gold": "https://static.prod-images.emergentagent.com/jobs/0ec9d1bd-8faa-4087-bf6b-71f9a075c8ee/images/a8682d378ebd4a5fee6d63360a460b17f3bac79cd2c2438341de35c2ae9f38b2.jpeg",
    "square-black": "https://static.prod-images.emergentagent.com/jobs/0ec9d1bd-8faa-4087-bf6b-71f9a075c8ee/images/a90ea556d4912527d6dda09861277e04bf39730ec2e91431afcd92be322496d2.jpeg",
    "clear-frame": "https://static.prod-images.emergentagent.com/jobs/0ec9d1bd-8faa-4087-bf6b-71f9a075c8ee/images/16929e5d2618af320cafec686cc3d19df509a61e57d662cf60695c6024b1b3b1.jpeg",
}

# Key strength per frame (low, high) on the "green excess" score.
# The default suits opaque frames; a frame that lets the screen show through
# needs a higher threshold or its rim gets keyed away with the background.
KEY_STRENGTH: dict[str, tuple[float, float]] = {}
DEFAULT_KEY_STRENGTH = (12.0, 48.0)


def fetch(url: str) -> Image.Image:
    with urllib.request.urlopen(url, timeout=90) as response:
        return Image.open(BytesIO(response.read())).convert("RGB")


def chroma_key(rgb: np.ndarray, strength: tuple[float, float]) -> np.ndarray:
    """Returns RGBA float array with the green screen keyed out and de-spilled."""
    r = rgb[:, :, 0]
    g = rgb[:, :, 1]
    b = rgb[:, :, 2]
    other = np.maximum(r, b)

    # How much greener than the strongest other channel this pixel is.
    excess = g.astype(np.float32) - other.astype(np.float32)
    # Full transparency above HIGH, fully opaque below LOW, linear ramp between.
    low, high = strength
    alpha = 1.0 - np.clip((excess - low) / (high - low), 0.0, 1.0)

    out = rgb.astype(np.float32).copy()
    # De-spill: pull the green channel down to the neighbouring channels
    # wherever it was dominant, which kills green fringing on soft edges.
    spill = np.maximum(g.astype(np.float32) - other.astype(np.float32), 0.0)
    out[:, :, 1] = g.astype(np.float32) - spill

    rgba = np.dstack([out, alpha * 255.0])
    return rgba


def largest_enclosed_holes(alpha: np.ndarray, count: int = 2) -> list[tuple[float, float, int]]:
    """
    Flood-fills transparent pixels and returns the `count` largest regions that
    do NOT touch the image border — i.e. the lens openings, not the background.
    Returns (centre_x, centre_y, area) per region, ordered by area desc.
    """
    height, width = alpha.shape
    transparent = alpha < 40
    visited = np.zeros_like(transparent, dtype=bool)
    regions: list[tuple[float, float, int]] = []

    for start_y in range(height):
        row = transparent[start_y]
        for start_x in range(width):
            if not row[start_x] or visited[start_y, start_x]:
                continue
            queue = deque([(start_y, start_x)])
            visited[start_y, start_x] = True
            pixels: list[tuple[int, int]] = []
            touches_border = False
            while queue:
                y, x = queue.popleft()
                pixels.append((y, x))
                if y == 0 or x == 0 or y == height - 1 or x == width - 1:
                    touches_border = True
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < height and 0 <= nx < width:
                        if transparent[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            queue.append((ny, nx))
            if touches_border or len(pixels) < 200:
                continue
            ys = np.fromiter((p[0] for p in pixels), dtype=np.float32, count=len(pixels))
            xs = np.fromiter((p[1] for p in pixels), dtype=np.float32, count=len(pixels))
            regions.append((float(xs.mean()), float(ys.mean()), len(pixels)))

    regions.sort(key=lambda item: item[2], reverse=True)
    return regions[:count]


def process(name: str, url: str) -> dict[str, float | str]:
    rgba = chroma_key(np.asarray(fetch(url)), KEY_STRENGTH.get(name, DEFAULT_KEY_STRENGTH))
    alpha = rgba[:, :, 3]

    # Crop to the frame itself.
    solid = alpha > 40
    rows = np.where(solid.any(axis=1))[0]
    cols = np.where(solid.any(axis=0))[0]
    if rows.size == 0 or cols.size == 0:
        raise RuntimeError(f"{name}: nothing left after keying")
    pad = 2
    y0 = max(int(rows[0]) - pad, 0)
    y1 = min(int(rows[-1]) + 1 + pad, rgba.shape[0])
    x0 = max(int(cols[0]) - pad, 0)
    x1 = min(int(cols[-1]) + 1 + pad, rgba.shape[1])
    cropped = rgba[y0:y1, x0:x1]

    image = Image.fromarray(np.clip(cropped, 0, 255).astype(np.uint8), mode="RGBA")
    height = max(1, round(image.height * CANVAS_W / image.width))
    image = image.resize((CANVAS_W, height), Image.LANCZOS)

    out_path = OUT_DIR / f"{name}.png"
    image.save(out_path, optimize=True)

    holes = largest_enclosed_holes(np.asarray(image)[:, :, 3], count=2)
    if len(holes) < 2:
        print(f"  !! {name}: found {len(holes)} lens hole(s) — keeping defaults", file=sys.stderr)
        return {
            "name": name,
            "file": out_path.name,
            "height": height,
            "lensHoles": len(holes),
        }

    holes.sort(key=lambda item: item[0])
    left, right = holes[0], holes[1]
    lens_distance = right[0] - left[0]
    centre_x = (left[0] + right[0]) / 2
    centre_y = (left[1] + right[1]) / 2

    return {
        "name": name,
        "file": out_path.name,
        "height": height,
        "lensHoles": 2,
        "lensDistancePx": round(lens_distance, 2),
        "scaleMultiplier": round(CANVAS_W / lens_distance, 4),
        "offsetX": round((CANVAS_W / 2 - centre_x) / CANVAS_W, 4),
        "offsetY": round((height / 2 - centre_y) / CANVAS_W, 4),
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    for name, url in SOURCES.items():
        print(f"processing {name}...")
        results.append(process(name, url))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
