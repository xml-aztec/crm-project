from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.payment_method import PaymentMethod
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate

async def get_all(db: AsyncSession):
    result = await db.execute(select(PaymentMethod))
    return result.scalars().all()

async def create(db: AsyncSession, data: PaymentMethodCreate):
    method = PaymentMethod(**data.dict())
    db.add(method)
    await db.commit()
    await db.refresh(method)
    return method

async def update(db: AsyncSession, id: int, data: PaymentMethodUpdate):
    method = await db.get(PaymentMethod, id)
    if not method:
        return None
    for key, value in data.dict().items():
        setattr(method, key, value)
    await db.commit()
    await db.refresh(method)
    return method

async def delete(db: AsyncSession, id: int):
    method = await db.get(PaymentMethod, id)
    if method:
        await db.delete(method)
        await db.commit()