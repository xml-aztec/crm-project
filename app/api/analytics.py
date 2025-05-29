from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from datetime import datetime
from typing import Optional, List

from app.schemas.analytics import (
    DailyIncome, DailyOrders, ManagerIncome, OrderStatusCount, OrderSummary
)
from app.core.dependencies import get_db
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
