from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db, is_order_owner_or_admin
from app.models.user import User
from app.repositories import order as repo
from app.schemas.order import OrderConfirmUpdate, OrderCreate, OrderRead, OrderStatusUpdate

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post(
    "/",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать заказ",
    description="Создаёт новый заказ с указанием клиента, статуса, менеджера, списка товаров и общей цены. "
                "Менеджер может также указать индивидуальные цены и заметку к заказу."
)
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create_order(db, data.model_dump(exclude={"items"}), data.items)

@router.get(
    "/",
    response_model=list[OrderRead],
    summary="Список заказов с фильтрами",
    description="Админ видит все заказы. Менеджер — только свои."
)
async def list_orders(
    skip: int = 0,
    limit: int = 10,
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    status_id: Optional[int] = Query(None),
    customer_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manager_id = current_user.id if current_user.role.name == "manager" else None
    return await repo.get_orders(
        db,
        skip=skip,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
        manager_id=manager_id,
        status_id=status_id,
        customer_name=customer_name,
    )

@router.patch(
    "/{order_id}/confirm",
    response_model=OrderRead,
    summary="Подтверждение заказа",
    description="Позволяет подтвердить или снять подтверждение заказа (например, после проверки админом или менеджером)."
)
async def confirm_order(
    order_id: int = Path(..., description="ID заказа"),
    data: OrderConfirmUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_order_owner_or_admin),
):
    order = await repo.confirm_order(db, order_id, data.confirmed)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch(
    "/{order_id}/status",
    response_model=OrderRead,
    summary="Обновление статуса заказа",
    description="Позволяет изменить статус заказа (например: 'Новый' → 'В работе' → 'Завершён')."
)
async def change_order_status(
    order_id: int = Path(..., description="ID заказа"),
    data: OrderStatusUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_order_owner_or_admin),
):
    order = await repo.update_order_status(db, order_id, data.status_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order