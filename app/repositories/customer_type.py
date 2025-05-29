from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.customer_type import CustomerType

async def get_all(db: AsyncSession):
    result = await db.execute(select(CustomerType).order_by(CustomerType.name))
    return result.scalars().all()

async def create(db: AsyncSession, data: dict):
    ct = CustomerType(**data)
    db.add(ct)
    await db.commit()
    await db.refresh(ct)
    return ct