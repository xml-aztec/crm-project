from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class SubcategoryBase(BaseModel):
    name: str
    category_id: int

class SubcategoryCreate(SubcategoryBase):
    pass

class SubcategoryRead(SubcategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    products_count: int = 0

class SubcategoryUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None

class SubcategoryPage(BaseModel):
    items: list[SubcategoryRead]
    total: int
    page: int
    page_size: int
    total_pages: int
