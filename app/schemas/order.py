from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from .order_item import OrderItemRead

class OrderBase(BaseModel):
    customer_id: Optional[int] = None
    status_id: Optional[int] = None
    note: Optional[str] = None

class OrderCreate(OrderBase):
    total_price: Decimal
    items: List["OrderItemCreate"]
    note: Optional[str] = None

class OrderRead(OrderBase):
    id: int
    total_price: Decimal
    created_at: datetime
    items: List[OrderItemRead]
    note: Optional[str] = None
    confirmed: bool
    confirmed_at: Optional[datetime]

class OrderStatusUpdate(BaseModel):
    status_id: int

class OrderConfirm(BaseModel):
    confirmed: bool

class OrderConfirmUpdate(BaseModel):
    confirmed: bool

    class Config:
        orm_mode = True

from .order_item import OrderItemCreate  # для использования внутри OrderCreate