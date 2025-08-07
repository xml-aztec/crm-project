from calendar import month_abbr
from decimal import Decimal
from sqlalchemy import and_, select, func, cast, Date, extract
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timezone
from collections import defaultdict
from statistics import mean, pstdev

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.monthly_target import MonthlyTarget
from app.models.product import Product
from app.models.supply_item import SupplyItem
from app.models.user import User
from app.models.order_status import OrderStatus
from app.schemas.analytics import ABCAnalysisEntry, ABCGroup


async def get_kpi_summary(db: AsyncSession, current_user: User):
    today = date.today()
    year, month = today.year, today.month

    prev_month = month - 1 or 12
    prev_year = year - 1 if prev_month == 12 else year

    def base_filter(y, m):
        conditions = [
            extract("year", Order.created_at) == y,
            extract("month", Order.created_at) == m
        ]
        if current_user.role.name != "admin":
            conditions.append(Order.user_id == current_user.id)
        return conditions

    orders_curr = await db.scalar(select(func.count(Order.id)).where(*base_filter(year, month)))
    customers_curr = await db.scalar(select(func.count(func.distinct(Order.customer_id))).where(*base_filter(year, month)))

    orders_prev = await db.scalar(select(func.count(Order.id)).where(*base_filter(prev_year, prev_month)))
    customers_prev = await db.scalar(select(func.count(func.distinct(Order.customer_id))).where(*base_filter(prev_year, prev_month)))

    def calc_change(curr, prev):
        if prev == 0:
            return 100.0 if curr > 0 else 0.0
        return round(((curr - prev) / prev) * 100, 2)

    return {
        "orders": {
            "count": orders_curr or 0,
            "change_percent": calc_change(orders_curr or 0, orders_prev or 0)
        },
        "customers": {
            "count": customers_curr or 0,
            "change_percent": calc_change(customers_curr or 0, customers_prev or 0)
        }
    }

async def get_sales_by_month(db: AsyncSession):
    current_year = date.today().year

    result = await db.execute(
        select(
            extract("month", Order.created_at).label("month"),
            func.coalesce(func.sum(OrderItem.final_price), 0).label("total")
        )
        .join(OrderItem, OrderItem.order_id == Order.id)
        .where(
            extract("year", Order.created_at) == current_year,
            Order.confirmed == True
        )
        .group_by(extract("month", Order.created_at))
        .order_by(extract("month", Order.created_at))
    )

    rows = result.fetchall()

    # Формируем результат на каждый месяц
    data = []
    monthly_totals = {int(row.month): float(row.total) for row in rows}
    for month in range(1, 13):
        data.append({
            "month": month_abbr[month],  # Jan, Feb, etc.
            "total": round(monthly_totals.get(month, 0), 2)
        })
    
    return data

async def get_kpi_monthly_revenue_profit(db: AsyncSession):
    current_year = datetime.now(timezone.utc).year

    query = (
        select(
            extract("month", Order.created_at).label("month"),
            func.coalesce(func.sum(OrderItem.final_price), 0).label("revenue"),
            func.coalesce(
                func.sum(OrderItem.final_price - (OrderItem.quantity * Product.cost_price)), 0
            ).label("profit")
        )
        .join(OrderItem, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(
            Order.confirmed == True,
            extract("year", Order.created_at) == current_year
        )
        .group_by("month")
        .order_by("month")
    )

    result = await db.execute(query)
    rows = result.fetchall()

    monthly_data = [
        {"month": int(row.month), "revenue": float(row.revenue), "profit": float(row.profit)}
        for row in rows
    ]

    # Заполнить отсутствующие месяцы нулями
    full_year_data = []
    for m in range(1, 13):
        match = next((r for r in monthly_data if r["month"] == m), None)
        if match:
            full_year_data.append(match)
        else:
            full_year_data.append({"month": m, "revenue": 0.0, "profit": 0.0})

    return full_year_data

async def get_daily_stats(db: AsyncSession):
    query = (
        select(
            cast(Order.created_at, Date).label("date"),
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.sum(OrderItem.final_price), 0).label("total_revenue"),
            func.coalesce(
                func.sum(OrderItem.final_price - (OrderItem.quantity * Product.cost_price)),
                0
            ).label("total_profit")
        )
        .join(Order.items)
        .join(OrderItem.product)
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date).desc())
    )
    result = await db.execute(query)
    return [
        {
            "date": row.date.isoformat(),
            "orders_count": row.orders_count,
            "total_revenue": float(row.total_revenue),
            "total_profit": float(row.total_profit)
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

async def get_monthly_summary(db: AsyncSession, current_user: User):
    today = date.today()
    year, month = today.year, today.month

    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    completed_status_id = await db.scalar(
        select(OrderStatus.id).where(OrderStatus.name.in_(["Завершен", "Завершён", "Completed"]))
    )

    base_filter = and_(Order.created_at >= start_date, Order.created_at < end_date)
    completed_filter = and_(base_filter, Order.status_id == completed_status_id)

    if current_user.role.name != "admin":
        base_filter = and_(base_filter, Order.user_id == current_user.id)
        completed_filter = and_(completed_filter, Order.user_id == current_user.id)

    total_orders = await db.scalar(select(func.count(Order.id)).where(base_filter))
    unique_customers = await db.scalar(
        select(func.count(func.distinct(Order.customer_id))).where(base_filter)
    )
    total_income = await db.scalar(
        select(func.coalesce(func.sum(Order.total_price), 0)).where(completed_filter)
    )
    average_order_value = await db.scalar(
        select(func.coalesce(func.avg(Order.total_price), 0)).where(completed_filter)
    )

    result = await db.execute(
        select(Order.status_id, func.count(Order.id))
        .where(base_filter)
        .group_by(Order.status_id)
    )

    status_counts = [{"status_id": row[0], "count": row[1]} for row in result.fetchall()]

    return {
        "total_orders": total_orders,
        "total_income": float(total_income),
        "average_order_value": float(average_order_value),
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
            Order.user_id.label("manager_id"),
            User.full_name,
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_price), 0).label("total_sum"),
            func.coalesce(
                func.sum(OrderItem.final_price - (OrderItem.quantity * Product.cost_price)),
                0
            ).label("total_profit")
        )
        .join(User, User.id == Order.user_id)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(OrderItem.product)
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
            "total_profit": float(row.total_profit)
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


async def get_kpi_extended_analytics(db: AsyncSession):
    today = date.today()
    year, month = today.year, today.month
    month_str = f"{year}-{month:02d}-01"

    query = (
        select(
            User.id.label("manager_id"),
            User.full_name,
            func.coalesce(func.sum(OrderItem.final_price * OrderItem.quantity), 0).label("revenue"),
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.avg(Order.total_price), 0).label("average_check"),
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
    )

    result = await db.execute(query)
    rows = result.fetchall()

    data = []
    for row in rows:
        progress = round((row.revenue / row.target * 100) if row.target else 0, 2)
        data.append({
            "manager_id": row.manager_id,
            "manager_name": row.full_name,
            "target": float(row.target),
            "revenue": float(row.revenue),
            "progress_percent": progress,
            "orders_count": row.orders_count,
            "average_check": float(row.average_check)
        })

    avg_kpi = round(sum([item["progress_percent"] for item in data]) / len(data), 2) if data else 0

    top = max(data, key=lambda x: x["progress_percent"], default=None)
    worst = min(data, key=lambda x: x["progress_percent"], default=None)

    return {
        "avg_kpi": avg_kpi,
        "top_performer": top,
        "worst_performer": worst,
        "managers": data
    }


async def get_top_supplied_products(db: AsyncSession, limit: int = 10):
    query = (
        select(
            SupplyItem.product_id,
            Product.name,
            func.sum(SupplyItem.quantity).label("total_supplied")
        )
        .join(Product, Product.id == SupplyItem.product_id)
        .group_by(SupplyItem.product_id, Product.name)
        .order_by(func.sum(SupplyItem.quantity).desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return [
        {
            "product_id": row.product_id,
            "product_name": row.name,
            "total_supplied": row.total_supplied
        }
        for row in result.fetchall()
    ]


async def get_abc_analysis(db: AsyncSession):
    today = date.today()
    year, month = today.year, today.month

    query = (
        select(
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            func.sum(OrderItem.final_price).label("revenue")
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.confirmed == True,
            extract("year", Order.created_at) == year,
            extract("month", Order.created_at) == month
        )
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.final_price).desc())
    )
    result = await db.execute(query)
    rows = result.fetchall()

    total_revenue = sum(row.revenue or 0 for row in rows)
    accumulated = 0
    data = []

    for row in rows:
        revenue = float(row.revenue or 0)
        percentage = (revenue / total_revenue) * 100 if total_revenue else 0
        accumulated += percentage

        if accumulated <= 80:
            group = "A"
        elif accumulated <= 95:
            group = "B"
        else:
            group = "C"

        data.append({
            "product_id": row.product_id,
            "product_name": row.product_name,
            "revenue": revenue,
            "percentage": round(percentage, 2),
            "group": group
        })

    return data


async def get_xyz_analysis(db):
    today = date.today()
    year = today.year
    month = today.month

    query = (
        select(
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            OrderItem.quantity,
            func.date(Order.created_at).label("order_date")
        )
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(
            extract("year", Order.created_at) == year,
            extract("month", Order.created_at) == month,
            Order.confirmed == True
        )
    )
    result = await db.execute(query)

    raw_data = defaultdict(lambda: defaultdict(int))
    product_names = {}

    for row in result.fetchall():
        product_id = row.product_id
        product_names[product_id] = row.product_name
        order_date = row.order_date
        raw_data[product_id][order_date] += row.quantity

    response = []
    for product_id, date_quantities in raw_data.items():
        daily_values = list(date_quantities.values())
        avg = mean(daily_values)
        std = pstdev(daily_values) if len(daily_values) > 1 else 0.0
        cv = std / avg if avg else 0.0

        if cv <= 0.5:
            label = "X"
        elif cv <= 1.0:
            label = "Y"
        else:
            label = "Z"

        response.append({
            "product_id": product_id,
            "product_name": product_names[product_id],
            "mean_quantity": round(avg, 2),
            "stddev_quantity": round(std, 2),
            "variation_coefficient": round(cv, 2),
            "label": label
        })

    return response