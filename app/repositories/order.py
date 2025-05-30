import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy import func  
from sqlalchemy.orm import selectinload, joinedload
from app.models.customer import Customer

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product


async def create_order(db: AsyncSession, order_data: dict, items_data: list):
    order = Order(**order_data)
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
                raise HTTPException(status_code=404, detail=f"Product with id={item.product_id} not found")
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
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.id == order.id)
    )
    return result.scalar_one()

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
            joinedload(Order.customer),  # обязательно
        )
        .order_by(Order.id.desc())
        .offset(skip)
        .limit(limit)
    )

    if any([date_from, date_to, manager_id, status_id, customer_name]):
        filters = []

        if date_from:
            filters.append(Order.created_at >= date_from)
        if date_to:
            filters.append(Order.created_at <= date_to)
        if manager_id:
            filters.append(Order.manager_id == manager_id)
        if status_id:
            filters.append(Order.status_id == status_id)
        if customer_name:
            filters.append(func.lower(Customer.name).ilike(f"%{customer_name.lower()}%"))

        query = query.join(Order.customer).where(*filters)

    result = await db.execute(query)
    return result.scalars().all()

async def confirm_order(db: AsyncSession, order_id: int, confirmed: bool) -> Optional[Order]:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        return None

    order.confirmed = confirmed
    order.confirmed_at = datetime.now(timezone.utc) if confirmed else None
    await db.commit()
    await db.refresh(order)
    return order


async def update_order_status(db: AsyncSession, order_id: int, status_id: int) -> Optional[Order]:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        return None

    order.status_id = status_id
    await db.commit()
    await db.refresh(order)
    return order