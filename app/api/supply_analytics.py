from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, is_admin
from app.schemas.analytics import TopSuppliedProduct
from app.schemas.supply_analytic import SupplyDailyStats, TopSupplier
from app.repositories.supply_analytic import get_supply_daily_stats, get_top_supplied_products, get_top_suppliers

router = APIRouter(prefix="/analytics/supply", tags=["Supply Analytics"])

@router.get("/daily", response_model=List[SupplyDailyStats], summary="Динамика поставок по дням")
async def supply_daily_stats(
    db: AsyncSession = Depends(get_db),
    _ = Depends(is_admin)
):
    """
    Возвращает динамику поставок:
    - дата
    - количество поставок
    - общее количество единиц товара
    - сумма поставки за день
    """
    return await get_supply_daily_stats(db)


@router.get("/top-suppliers", response_model=List[TopSupplier], summary="Топ поставщиков за месяц")
async def top_suppliers(
    db: AsyncSession = Depends(get_db),
    _ = Depends(is_admin)
):
    """
    Возвращает топ-10 поставщиков за **текущий месяц**:
    - Количество поставок
    - Общая сумма поставки
    - Общее количество единиц
    """
    return await get_top_suppliers(db)


@router.get("/top-supplied-products", response_model=List[TopSuppliedProduct], summary="Топ поставленных товаров")
async def top_supplied_products(
    db: AsyncSession = Depends(get_db),
    _ = Depends(is_admin)
):
    """
    Возвращает топ-10 товаров, поставленных за **текущий месяц**, отсортированных по общей сумме поставок.
    """
    return await get_top_supplied_products(db)