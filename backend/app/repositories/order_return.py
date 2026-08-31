from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_return import OrderReturn, OrderReturnItem, ReturnItemCondition, ReturnStatus
from app.models.user import User
from app.models.warehouse import Warehouse
from app.repositories import order as order_repo
from app.repositories import order_history as history_repo
from app.rbac.service import user_is_admin, user_is_manager_or_admin
from app.schemas.order_return import ReturnCreate
from app.utils.stock import apply_return_stock_effect

RETURN_LOAD_OPTIONS = (
    selectinload(OrderReturn.items).selectinload(OrderReturnItem.order_item).selectinload(OrderItem.product),
    joinedload(OrderReturn.created_by_user),
    joinedload(OrderReturn.approved_by_user),
)

CONDITION_LABELS = {
    ReturnItemCondition.resalable: "годный",
    ReturnItemCondition.defective: "брак",
}


async def _validate_return_quantities(
    db: AsyncSession,
    order_id: int,
    items: list[tuple[int, int]],
    exclude_return_id: Optional[int] = None,
) -> dict[int, OrderItem]:
    """Проверяет, что запрошенное к возврату количество по каждой позиции
    не превышает изначально заказанное с учётом уже возвращённого (сумма по
    всем возвратам этого заказа кроме отклонённых). Вызывается и при
    создании возврата, и при его подтверждении (exclude_return_id исключает
    из суммы сам подтверждаемый возврат, чтобы не засчитывать его дважды)."""
    order_item_ids = [order_item_id for order_item_id, _ in items]
    if len(order_item_ids) != len(set(order_item_ids)):
        raise HTTPException(400, detail="Одна и та же позиция заказа указана в возврате более одного раза")

    result = await db.execute(
        select(OrderItem)
        .options(joinedload(OrderItem.product))
        .where(OrderItem.order_id == order_id, OrderItem.id.in_(order_item_ids))
    )
    order_items = {oi.id: oi for oi in result.scalars().unique().all()}

    missing = set(order_item_ids) - set(order_items.keys())
    if missing:
        raise HTTPException(400, detail=f"Позиции заказа не найдены в этом заказе: {sorted(missing)}")

    sum_query = (
        select(OrderReturnItem.order_item_id, func.sum(OrderReturnItem.quantity))
        .join(OrderReturn, OrderReturn.id == OrderReturnItem.order_return_id)
        .where(
            OrderReturnItem.order_item_id.in_(order_item_ids),
            OrderReturn.status != ReturnStatus.rejected,
        )
    )
    if exclude_return_id is not None:
        sum_query = sum_query.where(OrderReturn.id != exclude_return_id)
    sum_query = sum_query.group_by(OrderReturnItem.order_item_id)

    sum_result = await db.execute(sum_query)
    already_returned = {row[0]: row[1] for row in sum_result.all()}

    for order_item_id, quantity in items:
        order_item = order_items[order_item_id]
        already = already_returned.get(order_item_id, 0)
        if already + quantity > order_item.quantity:
            product_name = order_item.product.name if order_item.product else f"ID={order_item.product_id}"
            raise HTTPException(
                400,
                detail=(
                    f"Нельзя вернуть {quantity} шт. товара '{product_name}': "
                    f"уже возвращено {already} из {order_item.quantity} заказанных"
                ),
            )

    return order_items


def _describe_return_items(items, order_items_map: dict[int, OrderItem]) -> str:
    parts = []
    for item in items:
        order_item = order_items_map.get(item.order_item_id)
        product_name = order_item.product.name if order_item and order_item.product else f"позиция {item.order_item_id}"
        parts.append(f"{item.quantity} шт. «{product_name}» ({CONDITION_LABELS[item.condition]})")
    return "Возврат: " + ", ".join(parts)


def _check_branch_access(current_user: User, order: Order, is_admin: bool) -> None:
    if (
        not is_admin
        and order.warehouse
        and current_user.branch_id is not None
        and order.warehouse.branch_id != current_user.branch_id
    ):
        raise HTTPException(status_code=403, detail="Нет доступа к заказу другого филиала")


async def get_return_by_id(db: AsyncSession, return_id: int) -> OrderReturn:
    result = await db.execute(
        select(OrderReturn).options(*RETURN_LOAD_OPTIONS).where(OrderReturn.id == return_id)
    )
    return result.scalar_one()


async def create_return(db: AsyncSession, data: ReturnCreate, current_user: User) -> OrderReturn:
    result = await db.execute(
        select(Order)
        .options(joinedload(Order.status), joinedload(Order.warehouse))
        .where(Order.id == data.order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if not order.confirmed or (order.status and order.status.name == "Отменен"):
        raise HTTPException(
            status_code=400,
            detail="Возврат можно оформить только по подтверждённому и неотменённому заказу",
        )

    is_admin = await user_is_admin(current_user, db)
    _check_branch_access(current_user, order, is_admin)

    items_map = await _validate_return_quantities(
        db, order.id, [(item.order_item_id, item.quantity) for item in data.items]
    )

    is_privileged = await user_is_manager_or_admin(current_user, db)
    now = datetime.now(timezone.utc)
    return_status = ReturnStatus.completed if is_privileged else ReturnStatus.requested

    order_return = OrderReturn(
        order_id=order.id,
        status=return_status,
        reason=data.reason,
        created_by=current_user.id,
        approved_by=current_user.id if is_privileged else None,
        approved_at=now if is_privileged else None,
    )
    db.add(order_return)
    await db.flush()

    for item_data in data.items:
        db.add(OrderReturnItem(
            order_return_id=order_return.id,
            order_item_id=item_data.order_item_id,
            quantity=item_data.quantity,
            condition=item_data.condition,
            reason=item_data.reason,
        ))

    if is_privileged:
        for item_data in data.items:
            order_item = items_map[item_data.order_item_id]
            await apply_return_stock_effect(
                db, order.warehouse_id, order_item.product_id, item_data.quantity, item_data.condition.value
            )

    action = "return_completed" if is_privileged else "return_requested"
    description = _describe_return_items(data.items, items_map)
    await history_repo.add_entry(db, order.id, action, description, user_id=current_user.id)

    await db.commit()
    return await get_return_by_id(db, order_return.id)


async def decide_return(
    db: AsyncSession, return_id: int, approve: bool, reason: Optional[str], current_user: User
) -> OrderReturn:
    result = await db.execute(
        select(OrderReturn).options(selectinload(OrderReturn.items)).where(OrderReturn.id == return_id)
    )
    order_return = result.scalar_one_or_none()
    if not order_return:
        raise HTTPException(status_code=404, detail="Возврат не найден")

    if order_return.status != ReturnStatus.requested:
        raise HTTPException(status_code=400, detail="Решение по этому возврату уже принято")

    order_result = await db.execute(
        select(Order)
        .options(joinedload(Order.warehouse))
        .where(Order.id == order_return.order_id)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    is_admin = await user_is_admin(current_user, db)
    _check_branch_access(current_user, order, is_admin)

    if approve:
        items_map = await _validate_return_quantities(
            db,
            order_return.order_id,
            [(item.order_item_id, item.quantity) for item in order_return.items],
            exclude_return_id=order_return.id,
        )
        for item in order_return.items:
            order_item = items_map[item.order_item_id]
            await apply_return_stock_effect(
                db, order.warehouse_id, order_item.product_id, item.quantity, item.condition.value
            )
        order_return.status = ReturnStatus.approved
        action = "return_approved"
        description = "Возврат подтверждён" + (f": {reason}" if reason else "")
    else:
        order_return.status = ReturnStatus.rejected
        action = "return_rejected"
        description = "Возврат отклонён" + (f": {reason}" if reason else "")

    order_return.approved_by = current_user.id
    order_return.approved_at = datetime.now(timezone.utc)

    await history_repo.add_entry(db, order_return.order_id, action, description, user_id=current_user.id)

    await db.commit()
    return await get_return_by_id(db, order_return.id)


async def get_returns(
    db: AsyncSession,
    current_user: User,
    order_id: Optional[int] = None,
    status: Optional[ReturnStatus] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[OrderReturn]:
    if order_id is not None:
        # Кто видит заказ — видит всю историю возвратов по нему, независимо
        # от того, кто их оформил (см. get_order_by_id для прав доступа).
        order = await order_repo.get_order_by_id(db, order_id, current_user)
        if not order:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        query = select(OrderReturn).options(*RETURN_LOAD_OPTIONS).where(OrderReturn.order_id == order_id)
    else:
        query = (
            select(OrderReturn)
            .options(*RETURN_LOAD_OPTIONS)
            .join(Order, Order.id == OrderReturn.order_id)
        )
        is_admin = await user_is_admin(current_user, db)
        if not is_admin:
            is_manager = await user_is_manager_or_admin(current_user, db)
            if is_manager:
                if current_user.branch_id is not None:
                    query = query.join(Warehouse, Warehouse.id == Order.warehouse_id, isouter=True).where(
                        Warehouse.branch_id == current_user.branch_id
                    )
            else:
                query = query.where(OrderReturn.created_by == current_user.id)

    if status is not None:
        query = query.where(OrderReturn.status == status)
    if date_from:
        query = query.where(OrderReturn.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.where(OrderReturn.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    query = query.order_by(OrderReturn.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().unique().all())
