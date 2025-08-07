from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime

from app.models.user import User
from app.schemas.analytics import (
    ABCAnalysisEntry,
    DailyIncome,
    DailyOrders,
    ManagerIncome,
    MonthlySummaryResponse,
    MonthlyTargetAnalytics,
    OrderStatusCount,
    OrderSummary,
    LeaderboardEntry, 
    ExtendedKPIAnalytics,
    TopSuppliedProduct,
    XYZAnalysisResult
)
from app.core.dependencies import get_current_user, get_db, is_admin
from app.repositories import analytics as repo

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/kpi-summary", summary="KPI по заказам и клиентам за месяц")
async def kpi_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await repo.get_kpi_summary(db, current_user)

@router.get("/analytics/sales-by-month", summary="Статистика продаж по месяцам")
async def sales_by_month(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await repo.get_sales_by_month(db)

@router.get(
    "/kpi/revenue-profit",
    summary="Выручка и прибыль по месяцам (текущий год)",
    description="Возвращает выручку и прибыль по каждому месяцу текущего года. Доступно только администраторам."
)
async def revenue_profit_chart(
    db: AsyncSession = Depends(get_db),
    user=Depends(is_admin)
):
    return await repo.get_kpi_monthly_revenue_profit(db)

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

@router.get(
    "/kpi/extended",
    response_model=ExtendedKPIAnalytics,
    summary="Расширенная KPI-аналитика по менеджерам",
    description="""
    Возвращает расширенную аналитику по KPI за текущий месяц:
    - Доход, цель, прогресс
    - Количество заказов, средний чек
    - Средний KPI по всем менеджерам
    - Топ и худший менеджеры по KPI
    """
)
async def kpi_extended_analytics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    return await repo.get_kpi_extended_analytics(db)


@router.get(
    "/supply/top-products",
    response_model=List[TopSuppliedProduct],
    summary="Топ поставляемых товаров",
    description="Возвращает топ товаров по объёму поставок (по умолчанию — топ-10)."
)
async def get_top_supplied_products(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    return await repo.get_top_supplied_products(db)


@router.get(
    "/abc-analysis",
    response_model=List[ABCAnalysisEntry],
    summary="ABC-анализ по товарам",
    description="""
    Анализ продаж по методу ABC:
    - Группа **A** — 80% выручки (топ‑товары)
    - Группа **B** — следующие 15%
    - Группа **C** — оставшиеся 5%
    Вычисляется на основе выручки по каждому товару за текущий месяц.
    """,
    tags=["Analytics"]
)
async def abc_analysis(
    db: AsyncSession = Depends(get_db),
    _ = Depends(is_admin)
):
    return await repo.get_abc_analysis(db)


@router.get("/xyz-analysis", response_model=List[XYZAnalysisResult], summary="XYZ-анализ продуктов")
async def xyz_analysis(
    db: AsyncSession = Depends(get_db),
    _ = Depends(is_admin)
):
    """
    Возвращает XYZ-анализ продуктов за **текущий месяц**:
    - среднее количество продаж в день
    - стандартное отклонение
    - коэффициент вариации
    - метка X/Y/Z по стабильности продаж
    """
    return await repo.get_xyz_analysis(db)