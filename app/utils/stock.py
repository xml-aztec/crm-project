from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
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