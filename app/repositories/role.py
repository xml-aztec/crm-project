from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.role import Role

async def get_roles(db: AsyncSession):
    result = await db.execute(select(Role))
    return result.scalars().all()