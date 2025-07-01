from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime

from .order_item import OrderItemRead, OrderItemCreate
from .payment_method import PaymentMethodOut
from .customer import CustomerBase
from .user import UserOutOrder

class OrderBase(BaseModel):
    customer_id: Optional[int] = None
    status_id: Optional[int] = None
    note: Optional[str] = None
    payment_method_id: Optional[int] = None
    installment_months: Optional[int] = None
    delivery_address: Optional[str] = None
    delivery_date: Optional[date] = None

class OrderCreate(OrderBase):
    total_price: Decimal
    items: List[OrderItemCreate]

class OrderUpdate(BaseModel):
    payment_method_id: Optional[int] = None
    installment_months: Optional[int] = None
    delivery_address: Optional[str] = None
    delivery_date: Optional[date] = None    
    note: Optional[str] = None

class OrderRead(OrderBase):
    id: int
    total_price: Decimal
    finalized_total_price: Optional[Decimal] = None
    created_at: datetime
    items: List[OrderItemRead]
    confirmed: bool
    confirmed_at: Optional[datetime]

    customer: CustomerBase
    user: Optional[UserOutOrder]
    payment_method: Optional[PaymentMethodOut]
    installment_months: Optional[int]

    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class OrderStatusUpdate(BaseModel):
    status_id: int
    cancellation_reason: Optional[str] = None

class OrderConfirm(BaseModel):
    confirmed: bool

class OrderConfirmUpdate(BaseModel):
    confirmed: bool

    class Config:
        orm_mode = True