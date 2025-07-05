from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import datetime

from app.schemas.supplier import SupplierOut
from app.schemas.warehouse import WarehouseOut

class SupplyItemCreate(BaseModel):
    product_id: int
    quantity: int
    cost_price: Optional[float] = None
    unit_price: Optional[float] = None

class SupplyCreate(BaseModel):
    supplier_id: int
    warehouse_id: int
    delivered_at: datetime
    items: List[SupplyItemCreate]

class SupplyItemUpdate(BaseModel):
    product_id: int
    quantity: int
    cost_price: Optional[float] = None
    unit_price: Optional[float] = None

class SupplyUpdate(BaseModel):
    supplier_id: Optional[int] = None
    delivered_at: Optional[datetime] = None
    items: Optional[List[SupplyItemUpdate]] = None

class SupplyItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    cost_price: Optional[float]
    unit_price: Optional[float]

    @model_validator(mode="before")
    @classmethod
    def load_product_name(cls, data):
        if isinstance(data, dict):
            return data
        return {
            "id": data.id,
            "product_id": data.product_id,
            "product_name": getattr(data.product, "name", None),
            "quantity": data.quantity,
            "cost_price": data.cost_price,
            "unit_price": data.unit_price
        }

    model_config = {
        "from_attributes": True
    }

class SupplyOut(BaseModel):
    id: int
    supplier: SupplierOut
    warehouse: WarehouseOut
    delivered_at: datetime
    created_at: datetime
    items: List[SupplyItemOut]

    model_config = {
        "from_attributes": True
    }

class SupplyListResponse(BaseModel):
    total: int
    items: List[SupplyOut]