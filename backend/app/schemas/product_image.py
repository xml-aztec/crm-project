from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ProductImageOut(BaseModel):
    id: int
    product_id: int
    thumbnail_url: str
    full_url: str
    position: int
    is_primary: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ImagePresignRequest(BaseModel):
    filename: str
    content_type: str
    file_size: int = Field(..., gt=0)


class ImagePresignResponse(BaseModel):
    upload_url: str
    key: str


class ImageConfirmRequest(BaseModel):
    key: str


class ImageReorderRequest(BaseModel):
    image_ids: List[int] = Field(..., min_length=1)
