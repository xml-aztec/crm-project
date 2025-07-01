from pydantic import BaseModel, constr
from typing import Optional

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    detail: Optional[str] = None  
    cost_price: float
    price: float
    in_stock: bool = True
    category_id: Optional[int]
    subcategory_id: Optional[int]
    brand_id: Optional[int]
    sku: str 
    barcode: Optional[str] = None 

class ProductCreate(ProductBase):
    pass

class ProductRead(ProductBase):
    id: int
    sku: Optional[str] = None
    barcode: Optional[str] = None
    qr_code: Optional[str] = None 

    class Config:
        orm_mode = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    detail: Optional[str] = None
    cost_price: Optional[float] = None 
    price: Optional[float] = None
    in_stock: Optional[bool] = None
    brand_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None

    class Config:
        orm_mode = True