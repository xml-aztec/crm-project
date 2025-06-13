from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.monthly_target import MonthlyTarget
from app.schemas.monthly_target import MonthlyTargetCreate
from app.utils.dates import normalize_month_string  


async def create_or_update_kpi(db: AsyncSession, data: MonthlyTargetCreate):
    month_normalized = normalize_month_string(data.month)

    stmt = select(MonthlyTarget).where(
        MonthlyTarget.manager_id == data.manager_id,
        MonthlyTarget.month == month_normalized
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.target_amount = data.target_amount
    else:
        new_kpi = MonthlyTarget(
            manager_id=data.manager_id,
            month=month_normalized,
            target_amount=data.target_amount
        )
        db.add(new_kpi)

    await db.commit()


async def get_manager_kpi(db: AsyncSession, manager_id: int, month: str):
    month_normalized = normalize_month_string(month)

    result = await db.execute(
        select(MonthlyTarget).where(
            MonthlyTarget.manager_id == manager_id,
            MonthlyTarget.month == month_normalized
        )
    )
    return result.scalar_one_or_none()


async def get_all_kpis(db: AsyncSession):
    result = await db.execute(select(MonthlyTarget))
    return result.scalars().all()


async def delete_kpi_by_id(db: AsyncSession, kpi_id: int) -> bool:
    result = await db.execute(
        select(MonthlyTarget).where(MonthlyTarget.id == kpi_id)
    )
    kpi = result.scalar_one_or_none()
    if not kpi:
        return False

    await db.delete(kpi)
    await db.commit()
    return True