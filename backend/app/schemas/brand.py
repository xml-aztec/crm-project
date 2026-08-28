from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class BrandBase(BaseModel):
    name: str

class BrandCreate(BrandBase):
    pass

class BrandRead(BrandBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    products_count: int = 0

class BrandUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    is_active: Optional[bool] = None

class BrandPage(BaseModel):
    items: list[BrandRead]
    total: int
    page: int
    page_size: int
    total_pages: int
