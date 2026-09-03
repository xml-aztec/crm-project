from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.product import ProductShortOut


class OrderItemCreate(BaseModel):
    """Вход при создании позиции заказа.

    unit_price и final_price здесь ОТСУТСТВУЮТ намеренно: обе величины
    считает сервер (app/utils/orders.py::price_order_item) по каталожной цене
    товара. Раньше клиент присылал их сам, и никто не сверял их ни с
    каталогом, ни между собой.

    Единственный санкционированный способ отойти от каталожной цены —
    discount_percent; он ограничен диапазоном 0–100 и требует права
    `orders.discount` (проверяется в слое API).
    """

    product_id: int
    quantity: int = Field(..., gt=0)
    discount_percent: Optional[Decimal] = Field(
        None, ge=0, le=100, description="Скидка в % от каталожной цены"
    )

    # Совместимость со старыми клиентами: лишние поля (unit_price/final_price)
    # молча игнорируются, а не приводят к ошибке валидации.
    model_config = {"extra": "ignore"}


class OrderItemRead(BaseModel):
    id: int
    order_id: int
    product_id: int
    product: ProductShortOut
    quantity: int
    unit_price: float
    final_price: float

    model_config = {"from_attributes": True}


class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, gt=0)
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)

    model_config = {"extra": "ignore"}
