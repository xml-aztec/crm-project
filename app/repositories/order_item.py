from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.order_item import OrderItem
from app.models.order import Order
from app.schemas.order_item import OrderItemCreate, OrderItemUpdate


async def add_order_item(db: AsyncSession, order_id: int, item_data: OrderItemCreate):
    new_item = OrderItem(
        order_id=order_id,
        product_id=item_data.product_id,
        quantity=item_data.quantity,
        unit_price=item_data.unit_price,
        final_price=item_data.final_price
    )
    db.add(new_item)
    await db.flush() 

    await _recalculate_order_total(db, order_id)
    await db.commit()
    await db.refresh(new_item)
    return new_item


async def update_order_item(db: AsyncSession, order_id: int, item_id: int, update_data: OrderItemUpdate):
    result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order_id, OrderItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        return None

    if update_data.quantity is not None:
        item.quantity = update_data.quantity
    if update_data.final_price is not None:
        item.final_price = update_data.final_price
    if update_data.note is not None:
        item.note = update_data.note

    await _recalculate_order_total(db, order_id)
    await db.commit()
    await db.refresh(item)
    return item


async def delete_order_item(db: AsyncSession, order_id: int, item_id: int) -> bool:
    result = await db.execute(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        return False

    await db.delete(item)
    await _recalculate_order_total(db, order_id)
    await db.commit()
    return True


async def _recalculate_order_total(db: AsyncSession, order_id: int):
    # Считаем итоговую сумму заказа заново
    result = await db.execute(
        select(func.coalesce(func.sum(OrderItem.final_price * OrderItem.quantity), 0))
        .where(OrderItem.order_id == order_id)
    )
    total = result.scalar() or 0

    order_result = await db.execute(select(Order).where(Order.id == order_id))
    order = order_result.scalar_one_or_none()
    if order:
        order.total_price = total