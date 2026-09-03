from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.order_item import OrderItem
from app.models.order import Order
from app.schemas.order_item import OrderItemCreate, OrderItemUpdate
from app.utils.orders import price_order_item, recalculate_order_total


async def _load_order_with_items(db: AsyncSession, order_id: int) -> Order | None:
    """Заказ вместе с позициями.

    recalculate_order_total обходит order.items; при загрузке через
    db.get(Order, id) эта связь остаётся ленивой, а ленивая подгрузка в
    async-сессии SQLAlchemy запрещена и падает с MissingGreenlet. Домен
    order_items не имел тестов, поэтому все три эндпоинта позиций (добавить,
    изменить, удалить) были нерабочими.
    """
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    return result.scalar_one_or_none()


async def _load_item_for_response(db: AsyncSession, item_id: int) -> OrderItem:
    """Перечитывает позицию вместе со связанным товаром.

    Схема ответа OrderItemRead требует вложенный `product`. После
    db.refresh() связь остаётся незагруженной, и Pydantic дёргает её уже вне
    async-контекста SQLAlchemy — запрос падает с MissingGreenlet. Домен
    order_items не был покрыт тестами, поэтому это оставалось незамеченным.
    """
    result = await db.execute(
        select(OrderItem)
        .options(selectinload(OrderItem.product))
        .where(OrderItem.id == item_id)
    )
    return result.scalar_one()


async def add_order_item(db: AsyncSession, order_id: int, item_data: OrderItemCreate):
    # Цену считает сервер, а не клиент — см. app/utils/orders.py::price_order_item.
    unit_price, final_price = await price_order_item(
        db,
        product_id=item_data.product_id,
        quantity=item_data.quantity,
        discount_percent=item_data.discount_percent,
    )

    new_item = OrderItem(
        order_id=order_id,
        product_id=item_data.product_id,
        quantity=item_data.quantity,
        unit_price=unit_price,
        final_price=final_price,
    )
    db.add(new_item)
    await db.flush()

    order = await _load_order_with_items(db, order_id)
    if order:
        await recalculate_order_total(order, db)

    await db.commit()
    return await _load_item_for_response(db, new_item.id)


async def update_order_item(db: AsyncSession, order_id: int, item_id: int, update_data: OrderItemUpdate):
    result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order_id, OrderItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        return None

    if update_data.quantity is not None:
        item.quantity = update_data.quantity

    # Итог строки ВСЕГДА пересчитывается от количества и каталожной цены.
    # Раньше сюда напрямую записывался присланный клиентом final_price, а при
    # изменении одного лишь quantity он не пересчитывался вовсе — позиция
    # оставалась с суммой от прежнего количества.
    unit_price, final_price = await price_order_item(
        db,
        product_id=item.product_id,
        quantity=item.quantity,
        discount_percent=update_data.discount_percent,
    )
    item.unit_price = unit_price
    item.final_price = final_price

    order = await _load_order_with_items(db, order_id)
    if order:
        await recalculate_order_total(order, db)

    await db.commit()
    return await _load_item_for_response(db, item.id)


async def delete_order_item(db: AsyncSession, order_id: int, item_id: int) -> bool:
    result = await db.execute(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        return False

    await db.delete(item)

    order = await _load_order_with_items(db, order_id)
    if order:
        await recalculate_order_total(order, db)

    await db.commit()
    return True
