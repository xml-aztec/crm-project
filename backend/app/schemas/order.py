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
    warehouse_id: int
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
    warehouse_id: int
    total_price: Decimal
    finalized_total_price: Optional[Decimal] = None
    created_at: datetime
    items: List[OrderItemRead]
    confirmed: bool
    confirmed_at: Optional[datetime]

    # Необязательный — как и customer_id выше. Клиента можно удалить, и по
    # FK ondelete="SET NULL" заказ намеренно остаётся с customer_id = NULL.
    # Пока в get_orders стоял внутренний join, такие заказы просто не
    # доходили до сериализации; после перехода на outer join обязательное
    # поле здесь роняло весь список с ResponseValidationError (500).
    customer: Optional[CustomerBase] = None
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