from typing import List, Optional, Tuple
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product
from app.models.product_stock import ProductStock
from app.schemas.product_stock import ProductStockCreate

LOW_STOCK_THRESHOLD = 10

async def get_filtered_with_stats(
    db: AsyncSession,
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    sku: Optional[str] = None,
    barcode: Optional[str] = None,
    name: Optional[str] = None,
    stock_level: str = "all",
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[ProductStock], dict]:
    stmt = select(ProductStock).join(Product, ProductStock.product_id == Product.id)

    if product_id is not None:
        stmt = stmt.where(ProductStock.product_id == product_id)
    if warehouse_id is not None:
        stmt = stmt.where(ProductStock.warehouse_id == warehouse_id)
    if sku:
        stmt = stmt.where(Product.sku.ilike(f"%{sku}%"))
    if barcode:
        stmt = stmt.where(Product.barcode.ilike(f"%{barcode}%"))
    if name:
        stmt = stmt.where(Product.name.ilike(f"%{name}%"))

    if stock_level == "in_stock":
        stmt = stmt.where(ProductStock.quantity > LOW_STOCK_THRESHOLD)
    elif stock_level == "low_stock":
        stmt = stmt.where(ProductStock.quantity > 0, ProductStock.quantity <= LOW_STOCK_THRESHOLD)
    elif stock_level == "out_of_stock":
        stmt = stmt.where(ProductStock.quantity == 0)

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    stocks = result.scalars().all()

    # статистика отдельно (без limit/offset)
    stat_stmt = select(
        func.count(ProductStock.id),
        func.sum(case((ProductStock.quantity > LOW_STOCK_THRESHOLD, 1), else_=0)),
        func.sum(case(((ProductStock.quantity > 0) & (ProductStock.quantity <= LOW_STOCK_THRESHOLD), 1), else_=0)),
        func.sum(case((ProductStock.quantity == 0, 1), else_=0)),
    ).join(Product, ProductStock.product_id == Product.id)

    if product_id is not None:
        stat_stmt = stat_stmt.where(ProductStock.product_id == product_id)
    if warehouse_id is not None:
        stat_stmt = stat_stmt.where(ProductStock.warehouse_id == warehouse_id)
    if sku:
        stat_stmt = stat_stmt.where(Product.sku.ilike(f"%{sku}%"))
    if barcode:
        stat_stmt = stat_stmt.where(Product.barcode.ilike(f"%{barcode}%"))
    if name:
        stat_stmt = stat_stmt.where(Product.name.ilike(f"%{name}%"))

    stat_result = await db.execute(stat_stmt)
    total, in_stock, low_stock, out_of_stock = stat_result.one()

    stats = {
        "total": total or 0,
        "in_stock": in_stock or 0,
        "low_stock": low_stock or 0,
        "out_of_stock": out_of_stock or 0,
    }

    return stocks, stats


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
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
):
    stmt = select(ProductStock)

    if product_id is not None:
        stmt = stmt.where(ProductStock.product_id == product_id)
    if warehouse_id is not None:
        stmt = stmt.where(ProductStock.warehouse_id == warehouse_id)

    result = await db.execute(stmt)
    return result.scalars().all()