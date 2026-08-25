import uuid
from typing import Optional

from pydantic import BaseModel, Field


class FrameBase(BaseModel):
    """Shared, editable product fields. Mirrored in frontend/src/data/frames.ts."""

    sku: str
    name: str
    price: int = 0
    color: str = ""
    size: str = ""
    stock: int = 0
    # Physical dimensions in mm — reference data for the shop.
    width: float = 140
    height: float = 45
    bridge_width: float = 18
    # Try-on calibration.
    scale_multiplier: float = 2.5
    offset_x: float = 0.0
    offset_y: float = 0.0
    rotation_offset: float = 0.0
    opacity: float = 1.0
    active: bool = True


class FrameCreate(FrameBase):
    pass


class FrameUpdate(BaseModel):
    """Every field optional — PATCH semantics."""

    sku: Optional[str] = None
    name: Optional[str] = None
    price: Optional[int] = None
    color: Optional[str] = None
    size: Optional[str] = None
    stock: Optional[int] = None
    width: Optional[float] = None
    height: Optional[float] = None
    bridge_width: Optional[float] = None
    scale_multiplier: Optional[float] = None
    offset_x: Optional[float] = None
    offset_y: Optional[float] = None
    rotation_offset: Optional[float] = None
    opacity: Optional[float] = None
    active: Optional[bool] = None


class Frame(FrameBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sort_order: int = 0
    has_image: bool = False
    # Bumped on every image upload so the browser cache busts.
    image_version: int = 0
    auto_calibrated: bool = False


class ImageProcessResult(BaseModel):
    """Returned after an upload so the admin UI can show what was derived."""

    frame: Frame
    lens_holes_found: int
    auto_calibrated: bool
    warning: Optional[str] = None


class PinLogin(BaseModel):
    pin: str


class AdminSession(BaseModel):
    authenticated: bool
