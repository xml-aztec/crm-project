from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product_stock import ProductStock
from app.schemas.product_stock import ProductStockCreate

async def filter_stock(
    db: AsyncSession,
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    in_stock_only: bool = False
) -> List[ProductStock]:
    stmt = select(ProductStock)

    if product_id is not None:
        stmt = stmt.where(ProductStock.product_id == product_id)

    if warehouse_id is not None:
        stmt = stmt.where(ProductStock.warehouse_id == warehouse_id)

    if in_stock_only:
        stmt = stmt.where(ProductStock.quantity > 0)

    result = await db.execute(stmt)
    return result.scalars().all()


async def upsert(db: AsyncSession, data: ProductStockCreate):
    stmt = select(ProductStock).where(
        ProductStock.product_id == data.product_id,
        ProductStock.warehouse_id == data.warehouse_id
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.quantity = data.quantity
        await db.commit()
        await db.refresh(existing)
        return existing

    new_stock = ProductStock(**data.model_dump())
    db.add(new_stock)
    await db.commit()
    await db.refresh(new_stock)
    return new_stock

async def get_by_product_warehouse(db: AsyncSession, product_id: int, warehouse_id: int):
    stmt = select(ProductStock).where(
        ProductStock.product_id == product_id,
        ProductStock.warehouse_id == warehouse_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def get_all(db: AsyncSession):
    result = await db.execute(select(ProductStock))
    return result.scalars().all()

async def update(db: AsyncSession, stock_id: int, data: dict):
    stock = await db.get(ProductStock, stock_id)
    if not stock:
        return None
    for key, value in data.items():
        setattr(stock, key, value)
    await db.commit()
    await db.refresh(stock)
    return stock

async def delete(db: AsyncSession, stock_id: int):
    stock = await db.get(ProductStock, stock_id)
    if not stock:
        return False
    await db.delete(stock)
    await db.commit()
    return True

async def filter(
    db: AsyncSession,
    product_id: int | None = None,
    warehouse_id: int | None = None,
):
    stmt = select(ProductStock)

    if product_id is not None:
        stmt = stmt.where(ProductStock.product_id == product_id)
    if warehouse_id is not None:
        stmt = stmt.where(ProductStock.warehouse_id == warehouse_id)

    result = await db.execute(stmt)
    return result.scalars().all()