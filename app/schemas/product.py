from pydantic import BaseModel
from typing import Optional

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    detail: Optional[str] = None  
    price: float
    in_stock: bool = True
    category_id: Optional[int]
    subcategory_id: Optional[int]
    brand_id: Optional[int]

class ProductCreate(ProductBase):
    pass

class ProductRead(ProductBase):
    id: int

    class Config:
        orm_mode = True