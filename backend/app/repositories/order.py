from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, joinedload
from fastapi import HTTPException

from app.models.customer import Customer
from app.models.order import Order
from app.repositories import order_history as history_repo
from app.models.order_status import OrderStatus
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.product_stock import ProductStock
from app.models.user import User
from app.models.warehouse import Warehouse
from app.utils.orders import recalculate_order_total
from app.utils.stock import check_stock_before_order_creation, deduct_stock_for_order, restore_stock_for_order
from app.schemas.stock_log import StockLogCreate
from app.repositories.stock_log import create_stock_log


async def check_stock_before_confirmation(db: AsyncSession, order: Order):
    await db.refresh(order, ["items"])

    for item in order.items:
        stmt = select(ProductStock).where(
            ProductStock.product_id == item.product_id,
            ProductStock.warehouse_id == order.warehouse_id
        )
        result = await db.execute(stmt)
        stock = result.scalar_one_or_none()

        if not stock or stock.quantity < item.quantity:
            product_name = item.product.name if item.product else f"Product ID {item.product_id}"
            warehouse_name = order.warehouse.name if order.warehouse else f"Warehouse ID {order.warehouse_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно товара '{product_name}' на складе '{warehouse_name}'."
            )


async def get_order_by_id(db: AsyncSession, order_id: int, current_user: User) -> Optional[Order]:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        return None

    if current_user.role.name != "admin":
        if order.status and order.status.name == "Отменен" and order.user_id == current_user.id:
            raise HTTPException(403, detail="Вы не можете просматривать отменённый заказ")

    return order


async def create_order(
    db: AsyncSession,
    order_data: dict,
    items_data: list[OrderItem],
    current_user: User 
):
    if current_user.role.name.lower() != "admin":
        if order_data.get("warehouse_id") is None:
            raise HTTPException(400, detail="Склад должен быть указан")

        result = await db.execute(
            select(Warehouse.branch_id).where(Warehouse.id == order_data["warehouse_id"])
        )
        branch_id = result.scalar_one_or_none()

        if branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=403,
                detail="Нельзя создать заказ на складе другого филиала"
            )

    if not order_data.get("status_id"):
        result = await db.execute(
            select(OrderStatus.id).where(OrderStatus.name == "Новый")
        )
        default_status_id = result.scalar_one_or_none()
        if not default_status_id:
            raise HTTPException(400, detail="Статус 'Новый' не найден. Добавьте его в базу.")
        order_data["status_id"] = default_status_id

    await check_stock_before_order_creation(db, items_data, order_data["warehouse_id"])

    order = Order(**order_data, user_id=current_user.id, created_at=datetime.now(timezone.utc))
    db.add(order)
    await db.flush()

    for item in items_data:
        unit_price = item.unit_price

        if unit_price is None:
            result = await db.execute(
                select(Product.price).where(Product.id == item.product_id)
            )
            product_price = result.scalar_one_or_none()
            if product_price is None:
                raise HTTPException(404, detail=f"Товар id={item.product_id} не найден")
            unit_price = product_price

        db.add(OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=unit_price,
            final_price=item.final_price,
        ))

    await history_repo.add_entry(db, order.id, "created", "Заказ создан", user_id=current_user.id)
    await db.commit()

    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse)
        )
        .where(Order.id == order.id)
    )
    return result.scalar_one()


async def get_orders(
    db: AsyncSession,
    current_user: User,
    skip: int = 0,
    limit: int = 10,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    manager_id: Optional[int] = None,
    status_id: Optional[int] = None,
    customer_name: Optional[str] = None,
):
    query = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse),
        )
        .order_by(Order.id.desc())
        .offset(skip)
        .limit(limit)
    )

    filters = []

    if current_user.role.name != "admin":
        filters.append(Order.user_id == current_user.id)

        cancelled_status_result = await db.execute(
            select(OrderStatus.id).where(OrderStatus.name == "Отменен")
        )
        cancelled_status_id = cancelled_status_result.scalar_one_or_none()
        if cancelled_status_id is not None:
            filters.append(Order.status_id != cancelled_status_id)

    else:
        if manager_id:
            filters.append(Order.user_id == manager_id)

    if status_id:
        filters.append(Order.status_id == status_id)

    if customer_name:
        filters.append(func.lower(Customer.name).ilike(f"%{customer_name.lower()}%"))

    if date_from:
        if date_from.tzinfo is None:
            date_from = date_from.replace(tzinfo=timezone.utc)
        filters.append(Order.created_at >= date_from)

    if date_to:
        if date_to.tzinfo is None:
            date_to = date_to.replace(tzinfo=timezone.utc)
        filters.append(Order.created_at <= date_to)

    if filters:
        query = query.join(Order.customer).where(*filters)

    result = await db.execute(query)
    return result.scalars().all()


async def confirm_order(
    db: AsyncSession,
    order_id: int,
    confirmed: bool,
    current_user: User
) -> Optional[Order]:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse).joinedload(Warehouse.branch),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        return None
    
    if (
        current_user.role.name.lower() != "admin"
        and order.warehouse
        and order.warehouse.branch_id != current_user.branch_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Нельзя подтвердить заказ в другом филиале"
        )

    if order.confirmed and not confirmed:
        await restore_stock_for_order(db, order.id)
        for item in order.items:
            await create_stock_log(db, StockLogCreate(
                product_id=item.product_id,
                warehouse_id=order.warehouse_id,
                quantity=item.quantity,
                type="return",
                note=f"Отмена подтверждения заказа #{order.id}"
            ))

    if confirmed and not order.confirmed:
        await deduct_stock_for_order(db, order)
        for item in order.items:
            await create_stock_log(db, StockLogCreate(
                product_id=item.product_id,
                warehouse_id=order.warehouse_id,
                quantity=item.quantity,
                type="outgoing",
                note=f"Подтверждение заказа #{order.id}"
            ))

    order.confirmed = confirmed
    order.confirmed_at = datetime.now(timezone.utc) if confirmed else None

    if confirmed and order.finalized_total_price is None:
        order.finalized_total_price = order.total_price
    if not confirmed:
        order.finalized_total_price = None

    if confirmed:
        await history_repo.add_entry(db, order_id, "confirmed", "Заказ подтверждён", user_id=current_user.id)
    else:
        await history_repo.add_entry(db, order_id, "unconfirmed", "Подтверждение снято", user_id=current_user.id)

    await db.commit()

    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse).joinedload(Warehouse.branch),
        )
        .where(Order.id == order_id)
    )
    return result.scalar_one()


async def update_order_status(
    db: AsyncSession,
    order_id: int,
    status_id: int,
    current_user: User,
    cancellation_reason: Optional[str] = None
) -> Optional[Order]:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    cancelled_status_result = await db.execute(
        select(OrderStatus.id).where(OrderStatus.name == "Отменен")
    )
    cancelled_status_id = cancelled_status_result.scalar_one_or_none()

    confirmed_status_result = await db.execute(
        select(OrderStatus.id).where(OrderStatus.name == "Подтверждён")
    )
    confirmed_status_id = confirmed_status_result.scalar_one_or_none()

    if status_id == cancelled_status_id:
        if current_user.role.name.lower() != "admin" and order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к отмене заказа")
        if not cancellation_reason:
            raise HTTPException(status_code=400, detail="Укажите причину отмены")
        order.cancelled_at = datetime.now(timezone.utc)
        order.cancellation_reason = cancellation_reason
        if order.finalized_total_price is None:
            order.finalized_total_price = order.total_price

    if status_id == confirmed_status_id:
        if order.finalized_total_price is None:
            order.finalized_total_price = order.total_price

    old_status_name = order.status.name if order.status else "—"
    order.status_id = status_id

    new_status_result = await db.execute(select(OrderStatus.name).where(OrderStatus.id == status_id))
    new_status_name = new_status_result.scalar_one_or_none() or str(status_id)

    if status_id == cancelled_status_id:
        desc = f"Заказ отменён. Причина: {cancellation_reason}"
    else:
        desc = f"Статус изменён: «{old_status_name}» → «{new_status_name}»"
    await history_repo.add_entry(db, order_id, "status_changed", desc, user_id=current_user.id)

    await db.commit()
    await db.refresh(order)
    return order


async def delete_order(db: AsyncSession, order_id: int) -> None:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.confirmed:
        await restore_stock_for_order(db, order.id)
        for item in order.items:
            await create_stock_log(db, StockLogCreate(
                product_id=item.product_id,
                warehouse_id=order.warehouse_id,
                quantity=item.quantity,
                type="return",
                note=f"Удаление подтверждённого заказа #{order.id}"
            ))

    await db.delete(order)
    await db.commit()