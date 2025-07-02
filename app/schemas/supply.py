from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SupplyItemCreate(BaseModel):
    product_id: int
    quantity: int
    cost_price: Optional[float] = None
    unit_price: Optional[float] = None

class SupplyCreate(BaseModel):
    supplier_name: str
    warehouse_id: int
    delivered_at: datetime
    items: List[SupplyItemCreate]

class SupplyItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    cost_price: Optional[float]
    unit_price: Optional[float]

    class Config:
        orm_mode = True

class SupplyOut(BaseModel):
    id: int
    supplier_name: str
    warehouse_id: int
    delivered_at: datetime
    created_at: datetime
    items: List[SupplyItemOut]

    class Config:
        orm_mode = True