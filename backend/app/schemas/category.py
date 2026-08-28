from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    products_count: int = 0
    subcategories_count: int = 0

class CategoryPage(BaseModel):
    items: list[CategoryRead]
    total: int
    page: int
    page_size: int
    total_pages: int
