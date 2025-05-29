from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.category import Category

async def get_all(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.name))
    return result.scalars().all()

async def get_by_id(db: AsyncSession, category_id: int) -> Category | None:
    result = await db.execute(select(Category).where(Category.id == category_id))
    return result.scalar_one_or_none()

async def create(db: AsyncSession, name: str) -> Category:
    category = Category(name=name)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

async def delete(db: AsyncSession, category_id: int):
    category = await get_by_id(db, category_id)
    if category:
        await db.delete(category)
        await db.commit()