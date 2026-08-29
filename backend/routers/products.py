import uuid
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from lib.db import db

router = APIRouter(prefix="/products", tags=["Products"])

# 1. Define input validation matching Pydantic v2 conventions
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1)
    brand: str = Field(..., min_length=1)
    price: float = Field(..., gt=0)
    asset_url: str = Field(..., description="URL to 3D model .glb or transparent 2D .png")
    thumbnail_url: str = Field(..., description="Preview thumbnail image URL")

class ProductResponse(ProductCreate):
    id: str

# 2. Add POST endpoint for your Admin Panel
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate):
    product_dict = product.model_dump()
    # Adhere to your repo's convention using uuid4 text strings instead of Mongo ObjectIds
    product_dict["id"] = str(uuid.uuid4())
    
    await db.products.insert_one(product_dict)
    return product_dict

# 3. Add GET endpoint for your Tablet App Catalog
@router.get("/", response_model=list[ProductResponse])
async def list_products():
    # Fetch up to 1000 items from the async Motor engine
    products_cursor = db.products.find()
    return await products_cursor.to_list(length=1000)
