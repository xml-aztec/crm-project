import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Response
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
    XYZAnalysisResult,
    PnLReport,
    PnLMonthly,
)
from app.core.dependencies import get_current_user, get_db, is_admin
from app.repositories import analytics as repo
from app.rbac.service import user_is_admin
from app.utils.pdf import render_pnl_pdf

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/kpi-summary", summary="KPI по заказам и клиентам за месяц")
async def kpi_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await repo.get_kpi_summary(db, current_user)

@router.get("/sales-by-month", summary="Статистика продаж по месяцам")
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

@router.get(
    "/recent-orders",
    summary="Последние заказы",
    description="Возвращает список последних подтверждённых заказов.",
)
async def recent_orders(
    limit: int = Query(5, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await repo.get_recent_orders(db, limit=limit)

@router.get(
    "/order-status-summary",
    summary="Сводка по статусам заказов",
    description="Возвращает количество подтверждённых заказов по статусам и их долю в процентах.",
)
async def order_status_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await repo.get_order_status_summary(db)

@router.get("/daily", response_model=List[DailyIncome], summary="Доход по дням", dependencies=[Depends(get_current_user)])
async def get_daily_analytics(db: AsyncSession = Depends(get_db)):
    return await repo.get_daily_stats(db)

@router.get("/daily-orders", response_model=List[DailyOrders], summary="Количество заказов по дням", dependencies=[Depends(get_current_user)])
async def get_daily_orders(db: AsyncSession = Depends(get_db)):
    return await repo.get_daily_orders(db)

@router.get("/summary", response_model=OrderSummary, summary="Общая аналитика по заказам", dependencies=[Depends(get_current_user)])
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

@router.get("/orders-by-manager", response_model=List[ManagerIncome], summary="Доход по менеджерам", dependencies=[Depends(get_current_user)])
async def get_orders_by_manager(db: AsyncSession = Depends(get_db)):
    return await repo.get_orders_by_manager(db)

@router.get("/orders-by-status", response_model=List[OrderStatusCount], summary="Распределение заказов по статусам", dependencies=[Depends(get_current_user)])
async def get_orders_by_status(db: AsyncSession = Depends(get_db)):
    return await repo.get_orders_by_status(db)

@router.get(
    "/monthly-target-summary",
    summary="Аналитика: агрегированный KPI за текущий месяц"
)
async def monthly_target_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await repo.get_monthly_target_summary(db)


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
    if not await user_is_admin(current_user, db) and current_user.id != manager_id:
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


@router.get(
    "/pnl",
    response_model=PnLReport,
    summary="P&L отчёт за месяц",
    description="Выручка, себестоимость, валовая прибыль, расходы на зарплату и чистая прибыль за указанный месяц.",
)
async def pnl_report(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    return await repo.get_pnl_report(db, year, month)


@router.get(
    "/pnl/export-pdf",
    summary="Экспорт P&L отчёта в PDF",
    description="PDF за тот же месяц/год и с теми же данными, что и экранный отчёт /analytics/pnl."
)
async def export_pnl_pdf(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    data = await repo.get_pnl_report(db, year, month)
    report = PnLReport(**data)
    # pdfkit шеллится в wkhtmltopdf и блокирует поток — уводим в отдельный
    # поток, чтобы не держать event loop на время рендера.
    pdf_bytes = await asyncio.to_thread(render_pnl_pdf, report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=pnl_{year}_{month:02d}.pdf"},
    )


@router.get(
    "/pnl/yearly",
    response_model=List[PnLMonthly],
    summary="P&L по месяцам за год",
    description="12 месяцев P&L для графика (выручка, валовая прибыль, чистая прибыль).",
)
async def pnl_yearly(
    year: int = Query(..., ge=2020, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    return await repo.get_pnl_yearly(db, year)


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