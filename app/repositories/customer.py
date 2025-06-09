from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate

async def get_all(db: AsyncSession):
    result = await db.execute(select(Customer))
    return result.scalars().all()

async def get_by_id(db: AsyncSession, customer_id: int):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    return result.scalar_one_or_none()

async def create(db: AsyncSession, data: CustomerCreate):
    new_customer = Customer(**data.model_dump())
    db.add(new_customer)
    await db.commit()
    await db.refresh(new_customer)
    return new_customer

async def update(db: AsyncSession, customer_id: int, data: CustomerUpdate):
    customer = await get_by_id(db, customer_id)
    if not customer:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    await db.commit()
    await db.refresh(customer)
    return customer

async def delete(db: AsyncSession, customer_id: int):
    customer = await get_by_id(db, customer_id)
    if not customer:
        return None
    await db.delete(customer)
    await db.commit()
    return True