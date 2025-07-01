from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db, is_admin, is_order_owner_or_admin
from app.models.user import User
from app.repositories import order as repo
from app.schemas.order import (
    OrderConfirmUpdate,
    OrderCreate,
    OrderRead,
    OrderStatusUpdate,
    OrderUpdate,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "/",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать заказ",
    description="Создаёт новый заказ с указанием клиента, статуса, менеджера, списка товаров и общей цены. "
                "Менеджер может также указать индивидуальные цены и заметку к заказу."
)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await repo.create_order(
        db,
        data.model_dump(exclude={"items"}),
        data.items,
        current_user
    )


@router.patch(
    "/{order_id}",
    response_model=OrderRead,
    summary="Обновить способ оплаты и срок рассрочки",
    description="Обновляет payment_method_id, installment_months и note. Пересчитывает сумму с учётом наценки."
)
async def update_order(
    order_id: int,
    data: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_order_owner_or_admin),
):
    updated = await repo.update_order(db, order_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    return updated


@router.get(
    "/",
    response_model=list[OrderRead],
    summary="Список заказов с фильтрами",
    description="Админ видит все заказы. Менеджер — только свои. Отменённые заказы скрываются от менеджера."
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
    return await repo.get_orders(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
        status_id=status_id,
        customer_name=customer_name,
    )


@router.get(
    "/{order_id}",
    response_model=OrderRead,
    summary="Получить заказ по ID",
    description="Возвращает полную информацию о заказе: клиент, товары, способ оплаты, статус, доставка и т.д."
)
async def get_order_by_id(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user), 
):
    order = await repo.get_order_by_id(db, order_id, current_user) 
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


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
    description="Позволяет изменить статус заказа (например: 'Новый' → 'В работе' → 'Завершён' или 'Отменён')."
)
async def change_order_status(
    order_id: int = Path(..., description="ID заказа"),
    data: OrderStatusUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await repo.update_order_status(
        db=db,
        order_id=order_id,
        status_id=data.status_id,
        current_user=current_user,
        cancellation_reason=data.cancellation_reason,
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.delete(
    "/{order_id}",
    status_code=204,
    summary="Удаление заказа (только админ)",
    description="Удаляет заказ из базы данных. Доступно только администраторам."
)
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    await repo.delete_order(db, order_id)
    return Response(status_code=204)