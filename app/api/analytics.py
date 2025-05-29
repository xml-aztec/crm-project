from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from datetime import datetime
from typing import Optional

from app.core.dependencies import get_db
from app.models.order import Order
from app.models.customer import Customer
from app.models.order_item import OrderItem
from app.repositories import analytics as repo

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/daily")
async def get_daily_analytics(
    db: AsyncSession = Depends(get_db),
):
    return await repo.get_daily_stats(db)

@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None
):
    filters = []
    if date_from:
        filters.append(Order.created_at >= date_from)
    if date_to:
        filters.append(Order.created_at <= date_to)

    # Общее количество заказов
    total_orders_query = select(func.count()).select_from(Order).where(*filters)
    total_orders = (await db.execute(total_orders_query)).scalar()

    # Общая сумма выручки
    total_revenue_query = select(func.sum(OrderItem.final_price)).join(Order).where(*filters)
    total_revenue = (await db.execute(total_revenue_query)).scalar() or 0

    # Уникальные клиенты
    unique_customers_query = select(func.count(func.distinct(Order.customer_id))).where(*filters)
    unique_customers = (await db.execute(unique_customers_query)).scalar()

    # Средний чек
    average_check = round(total_revenue / total_orders, 2) if total_orders else 0

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "average_check": average_check,
        "unique_customers": unique_customers
    }
