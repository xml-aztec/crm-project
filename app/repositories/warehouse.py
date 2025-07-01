from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.warehouse import Warehouse

async def get_all(db: AsyncSession):
    result = await db.execute(select(Warehouse))
    return result.scalars().all()

async def get_by_id(db: AsyncSession, warehouse_id: int):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    return result.scalar_one_or_none()

async def create(db: AsyncSession, data: dict):
    warehouse = Warehouse(**data)
    db.add(warehouse)
    await db.commit()
    await db.refresh(warehouse)
    return warehouse

async def update(db: AsyncSession, warehouse_id: int, data: dict):
    warehouse = await get_by_id(db, warehouse_id)
    if not warehouse:
        return None
    for key, value in data.items():
        setattr(warehouse, key, value)
    await db.commit()
    await db.refresh(warehouse)
    return warehouse

async def delete(db: AsyncSession, warehouse_id: int):
    warehouse = await get_by_id(db, warehouse_id)
    if not warehouse:
        return False
    await db.delete(warehouse)
    await db.commit()
    return True