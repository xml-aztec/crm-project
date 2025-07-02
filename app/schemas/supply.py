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


class SupplyItemUpdate(BaseModel):
    product_id: int
    quantity: int
    cost_price: Optional[float] = None
    unit_price: Optional[float] = None


class SupplyUpdate(BaseModel):
    supplier_name: Optional[str] = None
    delivered_at: Optional[datetime] = None
    items: Optional[List[SupplyItemUpdate]] = None


class SupplyItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    cost_price: Optional[float]
    unit_price: Optional[float]

    model_config = {
        "from_attributes": True
    }


class SupplyOut(BaseModel):
    id: int
    supplier_name: str
    warehouse_id: int
    delivered_at: datetime
    created_at: datetime
    items: List[SupplyItemOut]

    model_config = {
        "from_attributes": True
    }