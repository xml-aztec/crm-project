from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseCreate

async def create(db: AsyncSession, data: WarehouseCreate):
    warehouse = Warehouse(**data.model_dump())
    db.add(warehouse)
    await db.commit()
    await db.refresh(warehouse)
    return warehouse

async def get_all(db: AsyncSession):
    result = await db.execute(select(Warehouse))
    return result.scalars().all()