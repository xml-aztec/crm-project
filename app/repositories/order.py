import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import datetime

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
):
    query = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product)
    )

    if date_from:
        query = query.where(Order.created_at >= date_from)
    if date_to:
        query = query.where(Order.created_at <= date_to)

    query = query.order_by(Order.id.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()