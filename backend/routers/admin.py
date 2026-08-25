import base64

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from lib.admin_auth import clear_session, is_authenticated, issue_session, require_admin, verify_pin
from lib.db import db
from lib.imaging import process_frame_image
from models.frame import (
    AdminSession,
    Frame,
    FrameCreate,
    FrameUpdate,
    ImageProcessResult,
    PinLogin,
)

router = APIRouter(prefix="/admin", tags=["admin"])

PROJECTION = {"_id": 0, "image_b64": 0}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


# --- session ---------------------------------------------------------------

@router.post("/login", response_model=AdminSession)
async def login(payload: PinLogin, request: Request, response: Response):
    if not verify_pin(payload.pin):
        raise HTTPException(status_code=401, detail="PIN salah.")
    issue_session(response, request)
    return AdminSession(authenticated=True)


@router.post("/logout", response_model=AdminSession)
async def logout(response: Response):
    clear_session(response)
    return AdminSession(authenticated=False)


@router.get("/me", response_model=AdminSession)
async def me(request: Request):
    return AdminSession(authenticated=is_authenticated(request))


# --- catalog management ----------------------------------------------------

@router.get("/frames", response_model=list[Frame], dependencies=[Depends(require_admin)])
async def list_all_frames():
    """Admin listing — includes frames hidden from the storefront."""
    docs = await db.frames.find({}, PROJECTION).to_list(500)
    docs.sort(key=lambda doc: (doc.get("sort_order", 0), doc.get("sku", "")))
    return [Frame(**doc) for doc in docs]


@router.post("/frames", response_model=Frame, dependencies=[Depends(require_admin)])
async def create_frame(payload: FrameCreate):
    if await db.frames.find_one({"sku": payload.sku}):
        raise HTTPException(status_code=409, detail=f"SKU {payload.sku} sudah dipakai.")
    count = await db.frames.count_documents({})
    frame = Frame(**payload.model_dump(), sort_order=count)
    await db.frames.insert_one(frame.model_dump())
    return frame


@router.put("/frames/{frame_id}", response_model=Frame, dependencies=[Depends(require_admin)])
async def update_frame(frame_id: str, payload: FrameUpdate):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=422, detail="Tidak ada perubahan.")
    if "sku" in changes:
        clash = await db.frames.find_one({"sku": changes["sku"], "id": {"$ne": frame_id}})
        if clash:
            raise HTTPException(status_code=409, detail=f"SKU {changes['sku']} sudah dipakai.")
    result = await db.frames.find_one_and_update(
        {"id": frame_id}, {"$set": changes}, projection=PROJECTION, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Frame tidak ditemukan")
    return Frame(**result)


@router.delete("/frames/{frame_id}", dependencies=[Depends(require_admin)])
async def delete_frame(frame_id: str):
    result = await db.frames.delete_one({"id": frame_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Frame tidak ditemukan")
    return {"deleted": frame_id}


@router.post(
    "/frames/{frame_id}/image",
    response_model=ImageProcessResult,
    dependencies=[Depends(require_admin)],
)
async def upload_frame_image(frame_id: str, file: UploadFile = File(...)):
    """
    Removes the photo's background, stores a transparent PNG on the product
    document, and auto-derives the try-on calibration from the lens openings.
    """
    doc = await db.frames.find_one({"id": frame_id}, PROJECTION)
    if not doc:
        raise HTTPException(status_code=404, detail="Frame tidak ditemukan")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="File kosong.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Ukuran file maksimal 8 MB.")

    try:
        png, calibration, warning = process_frame_image(data)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:  # noqa: BLE001 - surface a readable message
        raise HTTPException(
            status_code=422, detail="Gambar tidak dapat diproses. Gunakan file PNG/JPG."
        ) from error

    changes = {
        "image_b64": base64.b64encode(png).decode("ascii"),
        "has_image": True,
        "image_version": int(doc.get("image_version", 0)) + 1,
        "auto_calibrated": calibration.lens_holes >= 2,
        "scale_multiplier": calibration.scale_multiplier,
        "offset_x": calibration.offset_x,
        "offset_y": calibration.offset_y,
    }
    updated = await db.frames.find_one_and_update(
        {"id": frame_id}, {"$set": changes}, projection=PROJECTION, return_document=True
    )
    return ImageProcessResult(
        frame=Frame(**updated),
        lens_holes_found=calibration.lens_holes,
        auto_calibrated=calibration.lens_holes >= 2,
        warning=warning,
    )
