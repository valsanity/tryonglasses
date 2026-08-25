import base64

from fastapi import APIRouter, HTTPException, Response
from lib.db import db
from models.frame import Frame

router = APIRouter(tags=["frames"])

PROJECTION = {"_id": 0, "image_b64": 0}


@router.get("/frames", response_model=list[Frame])
async def list_frames():
    """Public catalog used by the try-on screen. Only active frames."""
    docs = await db.frames.find({"active": True}, PROJECTION).to_list(500)
    docs.sort(key=lambda doc: (doc.get("sort_order", 0), doc.get("sku", "")))
    return [Frame(**doc) for doc in docs]


@router.get("/frames/{frame_id}/image")
async def get_frame_image(frame_id: str):
    """Serves the transparent PNG stored alongside the product document."""
    doc = await db.frames.find_one({"id": frame_id}, {"_id": 0, "image_b64": 1})
    if not doc or not doc.get("image_b64"):
        raise HTTPException(status_code=404, detail="Gambar frame tidak ditemukan")
    return Response(
        content=base64.b64decode(doc["image_b64"]),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
