from fastapi import APIRouter, Depends, Query, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.dependencies import get_db, is_admin
from app.models.user import User
from app.schemas.cash_gap import CashGapForecastOut, CashGapForecastCreate, CashGapForecastUpdate
from app.repositories.cash_gap import (
    get_cash_gap_forecasts,
    create_cash_gap_forecast,
    update_cash_gap_forecast,
    delete_cash_gap_forecast
)

router = APIRouter(prefix="/cash-gap", tags=["Cash Gap"])


@router.get(
    "/",
    response_model=List[CashGapForecastOut],
    summary="Список прогнозов кассовых разрывов",
    description="""
    Возвращает список всех прогнозов кассовых разрывов.

    Можно отфильтровать по месяцу (`month` в формате YYYY-MM).
    
    Требуется авторизация администратора.
    """
)
async def list_cash_gap_forecasts(
    month: Optional[str] = Query(None, description="Фильтрация по месяцу в формате YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await get_cash_gap_forecasts(db, month=month)


@router.post(
    "/",
    response_model=CashGapForecastOut,
    summary="Создание прогноза кассового разрыва",
    description="""
    Создаёт прогноз кассового разрыва на указанный месяц с ожидаемыми доходами и расходами.

    Расчёт поля `gap_amount` происходит автоматически как `expected_income - expected_expense`.

    Требуется авторизация администратора.
    """
)
async def create_cash_gap_endpoint(
    data: CashGapForecastCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(is_admin)
):
    return await create_cash_gap_forecast(db, data.model_dump(), user_id=user.id)


@router.patch(
    "/{forecast_id}",
    response_model=CashGapForecastOut,
    summary="Обновление прогноза кассового разрыва",
    description="""
    Обновляет прогноз по ID. Автоматически пересчитывается `gap_amount`.

    Требуется авторизация администратора.
    """
)
async def update_cash_gap_endpoint(
    data: CashGapForecastUpdate,
    forecast_id: int = Path(..., description="ID прогноза"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    updated = await update_cash_gap_forecast(db, forecast_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Прогноз не найден")
    return updated


@router.delete(
    "/{forecast_id}",
    summary="Удаление прогноза кассового разрыва",
    description="Удаляет прогноз кассового разрыва по ID. Только для админов."
)
async def delete_cash_gap_endpoint(
    forecast_id: int = Path(..., description="ID прогноза"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    await delete_cash_gap_forecast(db, forecast_id)
    return {"detail": f"Прогноз с ID={forecast_id} удалён"}