from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.subcategory import Subcategory

async def get_all(db: AsyncSession) -> list[Subcategory]:
    result = await db.execute(select(Subcategory).order_by(Subcategory.name))
    return result.scalars().all()

async def get_by_id(db: AsyncSession, sub_id: int) -> Subcategory | None:
    result = await db.execute(select(Subcategory).where(Subcategory.id == sub_id))
    return result.scalar_one_or_none()

async def create(db: AsyncSession, name: str, category_id: int) -> Subcategory:
    sub = Subcategory(name=name, category_id=category_id)
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub

async def update(db: AsyncSession, subcategory_id: int, data):
    result = await db.execute(select(Subcategory).where(Subcategory.id == subcategory_id))
    subcategory = result.scalar_one_or_none()
    if not subcategory:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(subcategory, key, value)
    await db.commit()
    await db.refresh(subcategory)
    return subcategory

async def delete(db: AsyncSession, sub_id: int):
    sub = await get_by_id(db, sub_id)
    if sub:
        await db.delete(sub)
        await db.commit()