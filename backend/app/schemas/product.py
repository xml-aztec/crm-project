from pydantic import BaseModel, field_validator
from typing import List, Optional

from app.schemas.product_image import ProductImageOut
from app.utils.barcode_utils import validate_barcode

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    detail: Optional[str] = None  
    cost_price: float
    price: float
    category_id: Optional[int]
    subcategory_id: Optional[int]
    brand_id: Optional[int]
    sku: Optional[str] = None
    barcode: Optional[str] = None 

    @field_validator("barcode")
    @classmethod
    def check_barcode(cls, v):
        if v is None or v == "":
            return None
        v = v.strip()
        if not validate_barcode(v):
            raise ValueError(
                "Недопустимый штрихкод. Поддерживаются EAN-13, EAN-8, UPC-A/E, "
                "Code128, Code39, Code93, Codabar, ITF"
            )
        return v

class ProductCreate(ProductBase):
    pass

class ProductRead(ProductBase):
    id: int
    qr_code: Optional[str] = None
    available_quantity: Optional[int] = 0
    images: List[ProductImageOut] = []

    class Config:
        orm_mode = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    detail: Optional[str] = None
    cost_price: Optional[float] = None 
    price: Optional[float] = None
    brand_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None

    @field_validator("barcode")
    @classmethod
    def check_barcode(cls, v):
        if v is None or v == "":
            return None
        v = v.strip()
        if not validate_barcode(v):
            raise ValueError(
                "Недопустимый штрихкод. Поддерживаются EAN-13, EAN-8, UPC-A/E, "
                "Code128, Code39, Code93, Codabar, ITF"
            )
        return v

    class Config:
        orm_mode = True


class ProductShortOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True