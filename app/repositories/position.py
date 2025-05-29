from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.position import Position

async def get_positions(db: AsyncSession):
    result = await db.execute(select(Position))
    return result.scalars().all()

async def create_position(db: AsyncSession, name: str):
    position = Position(name=name)
    db.add(position)
    await db.commit()
    await db.refresh(position)
    return position

async def delete_position(db: AsyncSession, position_id: int):
    result = await db.execute(delete(Position).where(Position.id == position_id))
    if result.rowcount == 0:
        return False
    await db.commit()
    return True