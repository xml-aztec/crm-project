from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, joinedload
from fastapi import HTTPException

from app.models.customer import Customer
from app.models.order import Order
from app.models.order_status import OrderStatus
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.user import User
from app.utils.orders import recalculate_order_total


async def get_order_by_id(db: AsyncSession, order_id: int) -> Optional[Order]:
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
    return result.scalar_one_or_none()


async def create_order(
    db: AsyncSession,
    order_data: dict,
    items_data: list[OrderItem],
    current_user: User 
):
    if not order_data.get("status_id"):
        result = await db.execute(
            select(OrderStatus.id).where(OrderStatus.name == "Новый")
        )
        default_status_id = result.scalar_one_or_none()
        if not default_status_id:
            raise HTTPException(400, detail="Статус 'Новый' не найден. Добавьте его в базу.")
        order_data["status_id"] = default_status_id

    order = Order(**order_data, user_id=current_user.id)
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

    await db.commit()

    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
        )
        .where(Order.id == order.id)
    )
    return result.scalar_one()


async def update_order(db: AsyncSession, order_id: int, data: dict):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.payment_method),
            joinedload(Order.customer),
            joinedload(Order.user),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        return None

    for field in ["payment_method_id", "installment_months", "note", "delivery_address", "delivery_date"]:
        if field in data:
            setattr(order, field, data[field])

    await recalculate_order_total(order, db)
    await db.commit()
    await db.refresh(order)
    return order


async def get_orders(
    db: AsyncSession,
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
        )
        .order_by(Order.id.desc())
        .offset(skip)
        .limit(limit)
    )

    filters = []
    if date_from:
        filters.append(Order.created_at >= date_from)
    if date_to:
        filters.append(Order.created_at <= date_to)
    if manager_id:
        filters.append(Order.user_id == manager_id)
    if status_id:
        filters.append(Order.status_id == status_id)
    if customer_name:
        filters.append(func.lower(Customer.name).ilike(f"%{customer_name.lower()}%"))

    if filters:
        query = query.join(Order.customer).where(*filters)

    result = await db.execute(query)
    return result.scalars().all()


async def confirm_order(db: AsyncSession, order_id: int, confirmed: bool) -> Optional[Order]:
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
        return None

    order.confirmed = confirmed
    order.confirmed_at = datetime.now(timezone.utc) if confirmed else None

    await db.commit()
    await db.refresh(order)
    return order


async def update_order_status(db: AsyncSession, order_id: int, status_id: int) -> Optional[Order]:
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
        return None

    order.status_id = status_id
    await db.commit()
    await db.refresh(order)
    return order