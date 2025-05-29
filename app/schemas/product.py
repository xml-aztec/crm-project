from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class ProductBase(BaseModel):
    name: str
    price: Decimal
    stock: int = 0
    is_active: bool = True
    description: Optional[str] = None
    image_url: Optional[str] = None
    subcategory_id: int
    brand_id: int

class ProductCreate(ProductBase):
    pass

class ProductRead(ProductBase):
    id: int

    class Config:
        orm_mode = True