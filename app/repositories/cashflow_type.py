from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from app.models.cashflow_type import CashFlowType
from app.models.cashflow_category import CashFlowCategory

async def get_all_types(db: AsyncSession):
    result = await db.execute(select(CashFlowType).order_by(CashFlowType.name))
    return result.scalars().all()

async def create_type(db: AsyncSession, name: str):
    obj = CashFlowType(name=name)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

async def update_type(db: AsyncSession, type_id: int, name: str):
    result = await db.execute(select(CashFlowType).where(CashFlowType.id == type_id))
    obj = result.scalar_one_or_none()
    if not obj:
        return None
    obj.name = name
    await db.commit()
    await db.refresh(obj)
    return obj

async def delete_type(db: AsyncSession, type_id: int):
    await db.execute(delete(CashFlowType).where(CashFlowType.id == type_id))
    await db.commit()