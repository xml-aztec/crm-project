from datetime import date, datetime
from sqlalchemy import extract, select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.supplier import Supplier
from app.models.supply import Supply
from app.models.supply_item import SupplyItem


async def get_supply_daily_stats(db: AsyncSession):
    query = (
        select(
            cast(Supply.delivered_at, Date).label("date"),
            func.count(Supply.id).label("supply_count"),
            func.coalesce(func.sum(SupplyItem.quantity), 0).label("total_quantity"),
            func.coalesce(func.sum(SupplyItem.quantity * SupplyItem.unit_price), 0).label("total_supply_sum")
        )
        .join(SupplyItem, SupplyItem.supply_id == Supply.id)
        .group_by(cast(Supply.delivered_at, Date))
        .order_by(cast(Supply.delivered_at, Date))
    )
    result = await db.execute(query)
    return [
        {
            "date": row.date.isoformat(),
            "supply_count": row.supply_count,
            "total_quantity": float(row.total_quantity),
            "total_supply_sum": float(row.total_supply_sum),
        }
        for row in result.fetchall()
    ]


async def get_top_suppliers(db: AsyncSession):
    now = datetime.now()
    month = now.month
    year = now.year

    query = (
        select(
            Supplier.id.label("supplier_id"),
            Supplier.name.label("supplier_name"),
            func.count(Supply.id).label("supply_count"),
            func.coalesce(func.sum(SupplyItem.quantity), 0).label("total_quantity"),
            func.coalesce(func.sum(SupplyItem.quantity * SupplyItem.unit_price), 0).label("total_price"),
        )
        .select_from(Supply)
        .join(Supplier, Supplier.id == Supply.supplier_id)
        .join(SupplyItem, SupplyItem.supply_id == Supply.id)
        .where(
            extract("month", Supply.delivered_at) == month,
            extract("year", Supply.delivered_at) == year
        )
        .group_by(Supplier.id, Supplier.name)
        .order_by(func.sum(SupplyItem.quantity * SupplyItem.unit_price).desc())
        .limit(10)
    )

    result = await db.execute(query)
    return result.mappings().all()


async def get_top_supplied_products(db: AsyncSession):
    today = date.today()
    year, month = today.year, today.month

    query = (
        select(
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            func.count(SupplyItem.id).label("supply_count"),
            func.coalesce(func.sum(SupplyItem.quantity), 0).label("total_quantity"),
            func.coalesce(func.sum(SupplyItem.quantity * SupplyItem.unit_price), 0).label("total_supply_sum")
        )
        .join(Supply, Supply.id == SupplyItem.supply_id)
        .join(Product, Product.id == SupplyItem.product_id)
        .where(
            extract("year", Supply.delivered_at) == year,
            extract("month", Supply.delivered_at) == month
        )
        .group_by(Product.id, Product.name)
        .order_by(func.sum(SupplyItem.quantity * SupplyItem.unit_price).desc())
        .limit(10)
    )
    result = await db.execute(query)
    return [
        {
            "product_id": row.product_id,
            "product_name": row.product_name,
            "supply_count": row.supply_count,
            "total_quantity": float(row.total_quantity),
            "total_supply_sum": float(row.total_supply_sum),
        }
        for row in result.fetchall()
    ]