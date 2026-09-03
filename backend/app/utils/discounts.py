"""Проверка права на скидку по позициям заказа.

Отклонение от каталожной цены — единственный способ повлиять на сумму заказа
вручную (см. app/utils/orders.py::price_order_item), поэтому оно закрыто
отдельным правом `orders.discount`, а не идёт «в комплекте» с правом
создавать заказы. Проверка живёт в слое API, где доступны Request и
текущий пользователь.
"""
from typing import Iterable

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.rbac.dependencies import permissions_for_request

DISCOUNT_PERMISSION = "orders.discount"


async def ensure_may_discount(
    request: Request,
    current_user: User,
    db: AsyncSession,
    items: Iterable[object],
) -> None:
    """Пропускает запрос без скидок молча; при наличии хотя бы одной ненулевой
    скидки требует право `orders.discount`."""
    wants_discount = any(
        (getattr(item, "discount_percent", None) or 0) > 0 for item in items
    )
    if not wants_discount:
        return

    permissions = await permissions_for_request(request, current_user.id, db)
    if DISCOUNT_PERMISSION not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для скидки на позицию заказа",
        )
