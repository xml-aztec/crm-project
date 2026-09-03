from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db, is_order_owner_or_admin
from app.schemas.order_item import OrderItemCreate, OrderItemUpdate, OrderItemRead
from app.models.user import User
from app.repositories import order_item as repo
from app.utils.discounts import ensure_may_discount

router = APIRouter(prefix="/orders", tags=["Order Items"])

@router.post(
    "/{order_id}/items",
    response_model=OrderItemRead,
    status_code=201,
    summary="Добавить позицию в заказ",
    description="Добавляет новый товар в указанный заказ. Требуется ID заказа и данные товара.",
    dependencies=[Depends(get_current_user), Depends(is_order_owner_or_admin)]
)
async def add_item_to_order(
    order_id: int,
    request: Request,
    item_data: OrderItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ensure_may_discount(request, current_user, db, [item_data])
    return await repo.add_order_item(db, order_id, item_data)


@router.patch(
    "/{order_id}/items/{item_id}",
    response_model=OrderItemRead,
    status_code=200,
    summary="Обновить позицию заказа",
    description="Обновляет количество, цену или заметку у товара в заказе. Все поля необязательны.",
    dependencies=[Depends(get_current_user), Depends(is_order_owner_or_admin)]
)
async def update_order_item(
    order_id: int,
    item_id: int,
    request: Request,
    item_data: OrderItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ensure_may_discount(request, current_user, db, [item_data])
    updated_item = await repo.update_order_item(db, order_id, item_id, item_data)
    if not updated_item:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated_item


@router.delete(
    "/{order_id}/items/{item_id}",
    status_code=204,
    summary="Удалить позицию из заказа",
    description="Удаляет товар из заказа по его ID. Если позиция не найдена, возвращает 404.",
    dependencies=[Depends(get_current_user), Depends(is_order_owner_or_admin)]
)
async def delete_item_from_order(
    order_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
):
    success = await repo.delete_order_item(db, order_id, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")