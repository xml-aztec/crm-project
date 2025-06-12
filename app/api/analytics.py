from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from datetime import datetime
from typing import Optional, List

from app.models.user import User
from app.schemas.analytics import (
    DailyIncome, DailyOrders, ManagerIncome, MonthlyTargetAnalytics, OrderStatusCount, OrderSummary
)
from app.core.dependencies import get_current_user, get_db
from app.models.order import Order
from app.models.customer import Customer
from app.models.order_item import OrderItem
from app.repositories import analytics as repo

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get(
    "/daily",
    summary="Доход по дням",
    response_model=List[DailyIncome],
    description="Возвращает список суммарного дохода за каждый день."
)
async def get_daily_analytics(db: AsyncSession = Depends(get_db)):
    return await repo.get_daily_stats(db)


@router.get(
    "/daily-orders",
    summary="Количество заказов по дням",
    response_model=List[DailyOrders],
    description="Возвращает количество заказов, оформленных по дням."
)
async def get_daily_orders(db: AsyncSession = Depends(get_db)):
    return await repo.get_daily_orders(db)


@router.get(
    "/summary",
    summary="Общая аналитика по заказам",
    response_model=OrderSummary,
    description="Сводная информация: общее количество заказов, сумма продаж, средний чек."
)
async def get_summary(db: AsyncSession = Depends(get_db)):
    return await repo.get_order_summary(db)


@router.get(
    "/orders-by-manager",
    summary="Доход по менеджерам",
    response_model=List[ManagerIncome],
    description="Возвращает доход, сгенерированный каждым менеджером."
)
async def get_orders_by_manager(db: AsyncSession = Depends(get_db)):
    return await repo.get_orders_by_manager(db)


@router.get(
    "/orders-by-status",
    summary="Распределение заказов по статусам",
    response_model=List[OrderStatusCount],
    description="Показывает количество заказов по каждому статусу."
)
async def get_orders_by_status(db: AsyncSession = Depends(get_db)):
    return await repo.get_orders_by_status(db)

@router.get(
    "/monthly-target/{manager_id}",
    response_model=MonthlyTargetAnalytics,
    summary="Аналитика: KPI менеджера за текущий месяц"
)
async def monthly_target_analytics(
    manager_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Только админ или сам менеджер
    if current_user.role.name != "admin" and current_user.id != manager_id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    return await repo.get_monthly_target_data(db, manager_id)
