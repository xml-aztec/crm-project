from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.product_stock import ProductStock
from app.models.order import Order


async def restore_stock_for_order(db: AsyncSession, order_id: int):
    """Восстанавливает физический остаток при отмене/разподтверждении подтверждённого заказа."""
    warehouse_result = await db.execute(
        select(Order.warehouse_id).where(Order.id == order_id)
    )
    warehouse_id = warehouse_result.scalar_one_or_none()
    if warehouse_id is None:
        return

    result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order_id)
    )
    items = result.scalars().all()

    for item in items:
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(quantity=ProductStock.quantity + item.quantity)
        )

    await db.commit()


async def reserve_stock_for_order(db: AsyncSession, order_id: int):
    """Резервирует остаток для нового/возвращённого в ожидание заказа."""
    warehouse_result = await db.execute(
        select(Order.warehouse_id).where(Order.id == order_id)
    )
    warehouse_id = warehouse_result.scalar_one_or_none()
    if warehouse_id is None:
        return

    result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order_id)
    )
    items = result.scalars().all()

    for item in items:
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(reserved=ProductStock.reserved + item.quantity)
        )

    await db.commit()


async def release_stock_reservation(db: AsyncSession, order_id: int):
    """Снимает резерв при отмене/удалении неподтверждённого заказа."""
    warehouse_result = await db.execute(
        select(Order.warehouse_id).where(Order.id == order_id)
    )
    warehouse_id = warehouse_result.scalar_one_or_none()
    if warehouse_id is None:
        return

    result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order_id)
    )
    items = result.scalars().all()

    for item in items:
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(reserved=func.greatest(ProductStock.reserved - item.quantity, 0))
        )

    await db.commit()


async def check_stock_before_order_creation(
    db: AsyncSession,
    items: list[OrderItem],
    warehouse_id: int
):
    for item in items:
        stmt = select(ProductStock.quantity, ProductStock.reserved).where(
            ProductStock.product_id == item.product_id,
            ProductStock.warehouse_id == warehouse_id
        )
        result = await db.execute(stmt)
        row = result.one_or_none()

        if row is None:
            raise HTTPException(400, detail=f"Товар id={item.product_id} отсутствует на складе ID={warehouse_id}")

        quantity, reserved = row
        available = (quantity or 0) - (reserved or 0)

        if available < item.quantity:
            product_result = await db.execute(
                select(Product.name).where(Product.id == item.product_id)
            )
            product_name = product_result.scalar_one_or_none() or f"ID={item.product_id}"
            raise HTTPException(
                400,
                detail=f"Недостаточно товара '{product_name}' на складе (нужно {item.quantity}, доступно {available})"
            )


async def apply_return_stock_effect(
    db: AsyncSession,
    warehouse_id: int,
    product_id: int,
    quantity: int,
    condition: str,
):
    """Применяет эффект возврата на склад: годный товар — обратно в
    продаваемый остаток (та же механика, что и restore_stock_for_order),
    брак — в отдельный defective_quantity, не увеличивая доступный для
    продажи остаток. Без внутреннего commit — вызывающий код (создание/
    подтверждение возврата) коммитит один раз после применения всех позиций
    возврата и записи в историю заказа."""
    if condition == "resalable":
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(quantity=ProductStock.quantity + quantity)
        )
    else:
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(defective_quantity=ProductStock.defective_quantity + quantity)
        )


async def deduct_stock_for_order(db: AsyncSession, order: Order):
    await db.refresh(order, ["items", "warehouse"])

    for item in order.items:
        stmt = select(ProductStock).where(
            ProductStock.product_id == item.product_id,
            ProductStock.warehouse_id == order.warehouse_id
        )
        result = await db.execute(stmt)
        stock = result.scalar_one_or_none()

        if not stock:
            raise HTTPException(400, detail=f"Товар id={item.product_id} не найден на складе")

        if stock.quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно товара id={item.product_id} на складе id={order.warehouse_id}"
            )

        stock.quantity -= item.quantity
        # Снимаем резерв: товар переходит из «зарезервирован» в «списан»
        stock.reserved = max(0, stock.reserved - item.quantity)

    await db.flush()
