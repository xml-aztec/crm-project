from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.monthly_target import MonthlyTarget
from app.schemas.monthly_target import MonthlyTargetCreate
from datetime import date
from app.utils.dates import normalize_month_string


async def create_or_update_kpi(db: AsyncSession, data: MonthlyTargetCreate):
    """Создание или обновление KPI по менеджеру и месяцу."""
    month_date = data.month.replace(day=1)  # Гарантируем "YYYY-MM-01"

    stmt = select(MonthlyTarget).where(
        MonthlyTarget.manager_id == data.manager_id,
        MonthlyTarget.month == month_date
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.target_amount = data.target_amount
    else:
        new_kpi = MonthlyTarget(
            manager_id=data.manager_id,
            month=month_date,
            target_amount=data.target_amount
        )
        db.add(new_kpi)

    await db.commit()


async def get_manager_kpi(db: AsyncSession, manager_id: int, month: str):
    """Получить KPI менеджера за конкретный месяц (строка 'YYYY-MM' или 'YYYY-MM-DD')."""
    try:
        normalized = normalize_month_string(month)  # -> "YYYY-MM-01"
        month_date = date.fromisoformat(normalized)
    except Exception:
        return None 

    result = await db.execute(
        select(MonthlyTarget).where(
            MonthlyTarget.manager_id == manager_id,
            MonthlyTarget.month == month_date
        )
    )
    return result.scalar_one_or_none()


async def get_all_kpis(db: AsyncSession):
    """Получить список всех KPI."""
    result = await db.execute(select(MonthlyTarget))
    return result.scalars().all()


async def delete_kpi_by_id(db: AsyncSession, kpi_id: int) -> bool:
    """Удалить KPI по ID."""
    result = await db.execute(
        select(MonthlyTarget).where(MonthlyTarget.id == kpi_id)
    )
    kpi = result.scalar_one_or_none()
    if not kpi:
        return False

    await db.delete(kpi)
    await db.commit()
    return True