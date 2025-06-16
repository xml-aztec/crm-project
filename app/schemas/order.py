from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

from .order_item import OrderItemRead, OrderItemCreate
from .payment_method import PaymentMethodOut  

class OrderBase(BaseModel):
    customer_id: Optional[int] = None
    status_id: Optional[int] = None
    note: Optional[str] = None
    payment_method_id: Optional[int] = None
    installment_months: Optional[int] = None

class OrderCreate(OrderBase):
    total_price: Decimal
    items: List[OrderItemCreate]

class OrderUpdate(BaseModel):
    payment_method_id: Optional[int] = None
    installment_months: Optional[int] = None
    note: Optional[str] = None

class OrderRead(OrderBase):
    id: int
    total_price: Decimal
    created_at: datetime
    items: List[OrderItemRead]
    note: Optional[str] = None
    confirmed: bool
    confirmed_at: Optional[datetime]

    payment_method: Optional[PaymentMethodOut]  # связь для фронта
    installment_months: Optional[int]

    class Config:
        orm_mode = True

class OrderStatusUpdate(BaseModel):
    status_id: int

class OrderConfirm(BaseModel):
    confirmed: bool

class OrderConfirmUpdate(BaseModel):
    confirmed: bool

    class Config:
        orm_mode = True