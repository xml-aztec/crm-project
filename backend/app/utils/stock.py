from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.order_item import OrderItem
from app.models.product import Product
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
        stmt = (
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(quantity=ProductStock.quantity + item.quantity)
        )
        await db.execute(stmt)

    await db.commit()

async def check_stock_before_order_creation(
    db: AsyncSession,
    items: list[OrderItem],
    warehouse_id: int
):
    for item in items:
        stmt = select(ProductStock.quantity).where(
            ProductStock.product_id == item.product_id,
            ProductStock.warehouse_id == warehouse_id
        )
        result = await db.execute(stmt)
        quantity = result.scalar_one_or_none()

        if quantity is None:
            raise HTTPException(400, detail=f"Товар id={item.product_id} отсутствует на складе ID={warehouse_id}")

        if quantity < item.quantity:
            product_result = await db.execute(
                select(Product.name).where(Product.id == item.product_id)
            )
            product_name = product_result.scalar_one_or_none() or f"ID={item.product_id}"
            raise HTTPException(400, detail=f"Недостаточно товара '{product_name}' на складе (нужно {item.quantity}, есть {quantity})")
        
        
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

        # если есть логирование:
        # db.add(StockLog(
        #     product_id=item.product_id,
        #     warehouse_id=order.warehouse_id,
        #     order_id=order.id,
        #     quantity_change=-item.quantity,
        #     action="confirm"
        # ))

    await db.flush()