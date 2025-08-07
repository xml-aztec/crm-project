from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.order_status import OrderStatus

async def get_all(db: AsyncSession):
    result = await db.execute(select(OrderStatus).order_by(OrderStatus.name))
    return result.scalars().all()

async def create(db: AsyncSession, data: dict):
    status = OrderStatus(**data)
    db.add(status)
    await db.commit()
    await db.refresh(status)
    return status