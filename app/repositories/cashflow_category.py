from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from app.models.cashflow_category import CashFlowCategory


async def get_all_categories(db: AsyncSession):
    result = await db.execute(select(CashFlowCategory).order_by(CashFlowCategory.name))
    return result.scalars().all()

async def create_category(db: AsyncSession, name: str):
    obj = CashFlowCategory(name=name)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

async def update_category(db: AsyncSession, category_id: int, name: str):
    result = await db.execute(select(CashFlowCategory).where(CashFlowCategory.id == category_id))
    obj = result.scalar_one_or_none()
    if not obj:
        return None
    obj.name = name
    await db.commit()
    await db.refresh(obj)
    return obj

async def delete_category(db: AsyncSession, category_id: int):
    await db.execute(delete(CashFlowCategory).where(CashFlowCategory.id == category_id))
    await db.commit()