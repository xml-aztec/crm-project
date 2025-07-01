from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.order_item import OrderItem
from app.models.product_stock import ProductStock
from app.models.order import Order
from app.schemas.order import OrderRead


async def update_stock_on_order_confirmed(db: AsyncSession, order: Order):
    """
    Уменьшает остатки товаров на складе при подтверждении заказа.
    """
    if not order.items:
        return

    for item in order.items:
        product_id = item.product_id
        warehouse_id = order.warehouse_id
        quantity = item.quantity

        stmt = select(ProductStock).where(
            ProductStock.product_id == product_id,
            ProductStock.warehouse_id == warehouse_id,
        )
        result = await db.execute(stmt)
        stock = result.scalar_one_or_none()

        if not stock:
            raise HTTPException(status_code=400, detail=f"Товар ID {product_id} не найден на складе")

        if stock.quantity < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно товара (ID {product_id}) на складе '{stock.warehouse.name}': доступно {stock.quantity}, нужно {quantity}"
            )

        stock.quantity -= quantity

    await db.commit()

async def restore_stock_for_order(db: AsyncSession, order_id: int):
    """ 
    Восстанавливает остатки товаров на складе при отмене заказа.
    """
    result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order_id)
    )
    items = result.scalars().all()

    for item in items:
        stmt = (
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == item.order.warehouse_id  
            )
            .values(quantity=ProductStock.quantity + item.quantity)
        )
        await db.execute(stmt)

    await db.commit()