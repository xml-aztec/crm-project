from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.role import Role

async def init_roles(db: AsyncSession):
    default_roles = ["admin", "manager", "staff"]
    for role_name in default_roles:
        result = await db.execute(select(Role).where(Role.name == role_name))
        if not result.scalar_one_or_none():
            db.add(Role(name=role_name))
    await db.commit()