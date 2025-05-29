from pydantic import BaseModel
from decimal import Decimal

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: Decimal
    final_price: Decimal

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemRead(OrderItemBase):
    id: int
    order_id: int

    class Config:
        orm_mode = True