from decimal import Decimal
from sqlalchemy import select, func, cast, Date, extract
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.monthly_target import MonthlyTarget
from app.models.user import User
from app.models.order_status import OrderStatus


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
    total_orders_query = await db.execute(select(func.count(Order.id)))
    total_sum_query = await db.execute(select(func.coalesce(func.sum(Order.total_price), 0)))
    avg_sum_query = await db.execute(select(func.coalesce(func.avg(Order.total_price), 0)))
    unique_customers_query = await db.execute(
        select(func.count(func.distinct(Order.customer_id)))
    )

    status_counts_query = await db.execute(
        select(Order.status_id, func.count(Order.id)).group_by(Order.status_id)
    )

    total_orders = total_orders_query.scalar()
    total_sum = total_sum_query.scalar()
    avg_sum = avg_sum_query.scalar()
    unique_customers = unique_customers_query.scalar()
    status_counts_raw = status_counts_query.all()

    status_counts = [
        {"status_id": row[0], "count": row[1]} for row in status_counts_raw
    ]

    return {
        "total_orders": total_orders,
        "total_income": Decimal(total_sum),
        "average_order_value": Decimal(avg_sum),
        "unique_customers": unique_customers,
        "status_counts": status_counts,
    }


async def get_daily_orders(db: AsyncSession):
    result = await db.execute(
        select(
            cast(Order.created_at, Date).label("date"),
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_price), 0).label("total_sum")
        )
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date))
    )
    rows = result.all()
    return [
        {
            "date": row.date.isoformat(),
            "order_count": row.order_count,
            "total_sum": float(row.total_sum)
        }
        for row in rows
    ]


async def get_orders_by_manager(db: AsyncSession):
    result = await db.execute(
        select(
            Order.user_id,
            User.full_name,
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_price), 0).label("total_sum")
        )
        .join(User, User.id == Order.user_id)
        .group_by(Order.user_id, User.full_name)
        .order_by(func.count(Order.id).desc())
    )
    rows = result.all()
    return [
        {
            "manager_id": row.manager_id,
            "manager_name": row.full_name,
            "order_count": row.order_count,
            "total_sum": float(row.total_sum),
        }
        for row in rows
    ]


async def get_orders_by_status(db: AsyncSession):
    query = (
        select(Order.status_id, OrderStatus.name, func.count(Order.id))
        .join(OrderStatus, Order.status_id == OrderStatus.id)
        .group_by(Order.status_id, OrderStatus.name)
        .order_by(Order.status_id)
    )
    result = await db.execute(query)
    return [
        {"status_id": row[0], "status_name": row[1], "order_count": row[2]}
        for row in result.all()
    ]


async def get_monthly_target_data(db: AsyncSession, manager_id: int):
    today = date.today()
    year, month = today.year, today.month
    month_str = f"{year}-{month:02d}-01"

    kpi_result = await db.execute(
        select(MonthlyTarget.target_amount).where(
            MonthlyTarget.manager_id == manager_id,
            MonthlyTarget.month == month_str
        )
    )
    target_amount = kpi_result.scalar() or 0

    revenue_result = await db.execute(
        select(func.sum(OrderItem.final_price * OrderItem.quantity))
        .join(Order)
        .where(
            Order.user_id == manager_id,
            extract("month", Order.created_at) == month,
            extract("year", Order.created_at) == year
        )
    )
    revenue = revenue_result.scalar() or 0

    today_result = await db.execute(
        select(func.sum(OrderItem.final_price * OrderItem.quantity))
        .join(Order)
        .where(
            Order.user_id == manager_id,
            func.date(Order.created_at) == today
        )
    )
    today_revenue = today_result.scalar() or 0

    progress = (revenue / target_amount * 100) if target_amount else 0

    return {
        "target": target_amount,
        "revenue": revenue,
        "today_revenue": today_revenue,
        "progress_percent": round(progress, 2)
    }


async def get_leaderboard_data(db: AsyncSession):
    today = date.today()
    year, month = today.year, today.month
    month_str = f"{year}-{month:02d}-01"

    query = (
        select(
            User.id.label("manager_id"),
            User.full_name.label("manager_name"),
            func.coalesce(func.sum(OrderItem.final_price * OrderItem.quantity), 0).label("revenue"),
            MonthlyTarget.target_amount.label("target")
        )
        .join(Order, User.id == Order.user_id)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(MonthlyTarget, MonthlyTarget.manager_id == User.id)
        .where(
            extract("month", Order.created_at) == month,
            extract("year", Order.created_at) == year,
            MonthlyTarget.month == month_str
        )
        .group_by(User.id, User.full_name, MonthlyTarget.target_amount)
        .order_by(func.sum(OrderItem.final_price * OrderItem.quantity).desc())
    )

    result = await db.execute(query)
    rows = result.all()
    return [
        {
            "manager_id": row.manager_id,
            "manager_name": row.manager_name,
            "revenue": float(row.revenue),
            "target": float(row.target),
            "progress_percent": round((row.revenue / row.target * 100) if row.target else 0, 2)
        }
        for row in rows
    ]