from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.order import Order
from app.models.order_item import OrderItem
from sqlalchemy.orm import joinedload


async def get_daily_stats(db: AsyncSession):
    query = (
        select(
            cast(Order.created_at, Date).label("date"),
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.sum(OrderItem.final_price), 0).label("total_revenue")
        )
        .join(Order.items)
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date).desc())
    )
    result = await db.execute(query)
    return [
        {
            "date": row.date.isoformat(),
            "orders_count": row.orders_count,
            "total_revenue": float(row.total_revenue),
        }
        for row in result.fetchall()
    ]