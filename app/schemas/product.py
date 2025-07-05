import re
from pydantic import BaseModel, field_validator
from typing import Optional

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
    def validate_barcode(cls, v):
        if v is None or v == "":
            return None  
        if not re.fullmatch(r"\d{13}", v):
            raise ValueError("Штрихкод должен содержать 13 цифр (EAN-13)")
        digits = list(map(int, v))
        checksum = (10 - sum(digits[i] if i % 2 == 0 else digits[i] * 3 for i in range(12)) % 10) % 10
        if digits[12] != checksum:
            raise ValueError("Недействительный штрихкод: неверная контрольная сумма")
        return v

class ProductCreate(ProductBase):
    pass

class ProductRead(ProductBase):
    id: int
    qr_code: Optional[str] = None 
    available_quantity: Optional[int] = 0 

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
    def validate_barcode(cls, v):
        if v is None or v == "":
            return None
        if not re.fullmatch(r"\d{13}", v):
            raise ValueError("Штрихкод должен содержать 13 цифр (EAN-13)")
        digits = list(map(int, v))
        checksum = (10 - sum(digits[i] if i % 2 == 0 else digits[i] * 3 for i in range(12)) % 10) % 10
        if digits[12] != checksum:
            raise ValueError("Недействительный штрихкод: неверная контрольная сумма")
        return v

    class Config:
        orm_mode = True