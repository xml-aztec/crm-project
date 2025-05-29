from pydantic import BaseModel
from decimal import Decimal
from typing import Optional

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[Decimal]
    final_price: float

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemRead(OrderItemBase):
    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: float
    final_price: float

class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    price: Optional[float] = None
    note: Optional[str] = None

    class Config:
        orm_mode = True