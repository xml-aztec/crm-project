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

async def get_order_summary(db: AsyncSession):
    total_orders = await db.execute(select(func.count()).select_from(Order))
    total_sum = await db.execute(select(func.coalesce(func.sum(Order.total_price), 0)))
    avg_sum = await db.execute(select(func.coalesce(func.avg(Order.total_price), 0)))
    unique_customers = await db.execute(select(func.count(func.distinct(Order.customer_id))))

    status_counts = await db.execute(
        select(Order.status_id, func.count()).group_by(Order.status_id)
    )

    return {
        "total_orders": total_orders.scalar(),
        "total_sum": float(total_sum.scalar()),
        "avg_sum": float(avg_sum.scalar()),
        "unique_customers": unique_customers.scalar(),
        "status_counts": [
            {"status_id": row[0], "count": row[1]}
            for row in status_counts.all()
        ],
    }