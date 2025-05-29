from pydantic import BaseModel
from decimal import Decimal
from typing import Optional

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[Decimal]
    final_price: Decimal

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemRead(OrderItemBase):
    id: int
    order_id: int

    class Config:
        orm_mode = True