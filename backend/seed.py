"""
Seeds the frame catalog into MongoDB from the bundled PNG assets.
Idempotent: matches on SKU, so re-running only fills in what is missing.

Run: cd /app/backend && python seed.py
"""

import asyncio
import base64
from pathlib import Path

from lib.db import db
from models.frame import Frame

ASSET_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "glasses"

SEED = [
    {
        "sku": "OSB-001",
        "name": "Classic Black",
        "asset": "classic-black.png",
        "price": 350000,
        "color": "Hitam Glossy",
        "size": "Medium",
        "stock": 8,
        "width": 140,
        "height": 45,
        "bridge_width": 18,
        "scale_multiplier": 2.5501,
        "offset_x": -0.0004,
        "offset_y": 0.0525,
    },
    {
        "sku": "OSB-002",
        "name": "Classic Brown",
        "asset": "classic-brown.png",
        "price": 350000,
        "color": "Tortoise Brown",
        "size": "Large",
        "stock": 5,
        "width": 146,
        "height": 48,
        "bridge_width": 19,
        "scale_multiplier": 2.0571,
        "offset_x": 0.001,
        "offset_y": 0.0009,
    },
    {
        "sku": "OSB-003",
        "name": "Round Black",
        "asset": "round-black.png",
        "price": 375000,
        "color": "Matte Black",
        "size": "Small",
        "stock": 6,
        "width": 136,
        "height": 47,
        "bridge_width": 21,
        "scale_multiplier": 2.6426,
        "offset_x": 0.0008,
        "offset_y": 0.0494,
    },
    {
        "sku": "OSB-004",
        "name": "Round Gold",
        "asset": "round-gold.png",
        "price": 400000,
        "color": "Champagne Gold",
        "size": "Small",
        "stock": 4,
        "width": 137,
        "height": 47,
        "bridge_width": 20,
        "scale_multiplier": 2.5183,
        "offset_x": 0.0007,
        "offset_y": 0.0426,
    },
    {
        "sku": "OSB-005",
        "name": "Square Black",
        "asset": "square-black.png",
        "price": 400000,
        "color": "Deep Black",
        "size": "Large",
        "stock": 7,
        "width": 148,
        "height": 50,
        "bridge_width": 17,
        "scale_multiplier": 2.242,
        "offset_x": 0.0007,
        "offset_y": 0.0327,
    },
    {
        "sku": "OSB-006",
        "name": "Clear Frame",
        "asset": "clear-frame.png",
        "price": 425000,
        "color": "Frosted Crystal",
        "size": "Medium",
        "stock": 3,
        "width": 142,
        "height": 46,
        "bridge_width": 19,
        "scale_multiplier": 2.4121,
        "offset_x": 0.0042,
        "offset_y": 0.0343,
    },
]


async def main() -> None:
    created = 0
    for index, item in enumerate(SEED):
        if await db.frames.find_one({"sku": item["sku"]}):
            print(f"skip {item['sku']} (already present)")
            continue

        asset_path = ASSET_DIR / item["asset"]
        image_b64 = ""
        if asset_path.exists():
            image_b64 = base64.b64encode(asset_path.read_bytes()).decode("ascii")
        else:
            print(f"  !! asset missing: {asset_path}")

        payload = {k: v for k, v in item.items() if k != "asset"}
        frame = Frame(
            **payload,
            sort_order=index,
            has_image=bool(image_b64),
            image_version=1 if image_b64 else 0,
            auto_calibrated=True,
        )
        document = frame.model_dump()
        document["image_b64"] = image_b64
        await db.frames.insert_one(document)
        created += 1
        print(f"created {item['sku']} — {item['name']}")

    total = await db.frames.count_documents({})
    print(f"done: {created} created, {total} frames in catalog")


if __name__ == "__main__":
    asyncio.run(main())
