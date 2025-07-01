from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime

from app.models.user import User
from app.schemas.analytics import (
    DailyIncome,
    DailyOrders,
    ManagerIncome,
    MonthlySummaryResponse,
    MonthlyTargetAnalytics,
    OrderStatusCount,
    OrderSummary,
    LeaderboardEntry, 
)
from app.core.dependencies import get_current_user, get_db
from app.repositories import analytics as repo

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/daily", response_model=List[DailyIncome], summary="Доход по дням")
async def get_daily_analytics(db: AsyncSession = Depends(get_db)):
    return await repo.get_daily_stats(db)

@router.get("/daily-orders", response_model=List[DailyOrders], summary="Количество заказов по дням")
async def get_daily_orders(db: AsyncSession = Depends(get_db)):
    return await repo.get_daily_orders(db)

@router.get("/summary", response_model=OrderSummary, summary="Общая аналитика по заказам")
async def get_summary(db: AsyncSession = Depends(get_db)):
    return await repo.get_order_summary(db)

@router.get(
    "/monthly-summary",
    summary="Статистика заказов за текущий месяц",
    description="""
    Возвращает агрегированную аналитику по заказам **за текущий месяц**:
    - Общее количество заказов
    - Общая сумма
    - Средний чек
    - Количество уникальных клиентов
    - Распределение заказов по статусам
    """,
    response_model=MonthlySummaryResponse,
    tags=["Analytics"]
)
async def monthly_summary(db: AsyncSession = Depends(get_db),
                          current_user: User = Depends(get_current_user),):
    """
    Получить сводную аналитику заказов за текущий месяц.
    """
    return await repo.get_monthly_summary(db, current_user)

@router.get("/orders-by-manager", response_model=List[ManagerIncome], summary="Доход по менеджерам")
async def get_orders_by_manager(db: AsyncSession = Depends(get_db)):
    return await repo.get_orders_by_manager(db)

@router.get("/orders-by-status", response_model=List[OrderStatusCount], summary="Распределение заказов по статусам")
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
    if current_user.role.name != "admin" and current_user.id != manager_id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    return await repo.get_monthly_target_data(db, manager_id)

@router.get(
    "/leaderboard",
    response_model=List[LeaderboardEntry],
    summary="Лидерборд по выполнению KPI",
    description="Возвращает список менеджеров с доходом, целями и процентом выполнения KPI за текущий месяц."
)
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await repo.get_leaderboard_data(db)