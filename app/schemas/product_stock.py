from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProductStockBase(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int

class ProductStockCreate(ProductStockBase):
    pass

class ProductStockOut(ProductStockBase):
    id: int
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }

class ProductStockUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=0)

    model_config = {
        "from_attributes": True
    }