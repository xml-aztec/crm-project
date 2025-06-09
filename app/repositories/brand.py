from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.brand import Brand

async def get_all(db: AsyncSession) -> list[Brand]:
    result = await db.execute(select(Brand).order_by(Brand.name))
    return result.scalars().all()

async def get_by_id(db: AsyncSession, brand_id: int) -> Brand | None:
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    return result.scalar_one_or_none()

async def create(db: AsyncSession, name: str) -> Brand:
    brand = Brand(name=name)
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return brand

async def update(db: AsyncSession, brand_id: int, data):
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(brand, key, value)
    await db.commit()
    await db.refresh(brand)
    return brand

async def delete(db: AsyncSession, brand_id: int):
    brand = await get_by_id(db, brand_id)
    if brand:
        await db.delete(brand)
        await db.commit()