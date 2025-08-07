from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.models.cash_gap_forecast import CashGapForecast
from sqlalchemy.exc import NoResultFound
from typing import List, Optional

async def get_cash_gap_forecasts(db: AsyncSession, month: Optional[str] = None) -> List[CashGapForecast]:
    stmt = select(CashGapForecast)
    if month:
        stmt = stmt.where(CashGapForecast.month == month)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_cash_gap_forecast(db: AsyncSession, data: dict, user_id: int) -> CashGapForecast:
    forecast = CashGapForecast(**data)
    forecast.created_by = user_id
    forecast.gap_amount = forecast.expected_income - forecast.expected_expense
    db.add(forecast)
    await db.commit()
    await db.refresh(forecast)
    return forecast


async def update_cash_gap_forecast(db: AsyncSession, forecast_id: int, data: dict) -> Optional[CashGapForecast]:
    stmt = select(CashGapForecast).where(CashGapForecast.id == forecast_id)
    result = await db.execute(stmt)
    forecast = result.scalar_one_or_none()

    if not forecast:
        return None

    for key, value in data.items():
        setattr(forecast, key, value)

    # Пересчёт кассового разрыва
    forecast.gap_amount = forecast.expected_income - forecast.expected_expense
    await db.commit()
    await db.refresh(forecast)
    return forecast


async def delete_cash_gap_forecast(db: AsyncSession, forecast_id: int) -> None:
    stmt = delete(CashGapForecast).where(CashGapForecast.id == forecast_id)
    await db.execute(stmt)
    await db.commit()