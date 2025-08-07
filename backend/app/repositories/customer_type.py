from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.customer_type import CustomerType
from app.schemas.customer_type import CustomerTypeUpdate

async def get_all(db: AsyncSession):
    result = await db.execute(select(CustomerType).order_by(CustomerType.name))
    return result.scalars().all()

async def create(db: AsyncSession, data: dict):
    ct = CustomerType(**data)
    db.add(ct)
    await db.commit()
    await db.refresh(ct)
    return ct

async def update(db: AsyncSession, type_id: int, data: CustomerTypeUpdate):
    result = await db.execute(select(CustomerType).where(CustomerType.id == type_id))
    customer_type = result.scalar_one_or_none()
    if not customer_type:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(customer_type, key, value)
    await db.commit()
    await db.refresh(customer_type)
    return customer_type

async def delete(db: AsyncSession, type_id: int):
    result = await db.execute(select(CustomerType).where(CustomerType.id == type_id))
    customer_type = result.scalar_one_or_none()
    if not customer_type:
        return False
    await db.delete(customer_type)
    await db.commit()
    return True