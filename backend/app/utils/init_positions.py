from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.position import Position

DEFAULT_POSITIONS = [
    "Менеджер по продажам",
    "Старший менеджер",
    "Директор",
    "Бухгалтер",
    "Склад",
    "Логист",
    "Маркетолог",
    "Аналитик",
]


async def init_positions(session: AsyncSession) -> None:
    result = await session.execute(select(Position))
    existing = {p.name for p in result.scalars().all()}
    for name in DEFAULT_POSITIONS:
        if name not in existing:
            session.add(Position(name=name))
    await session.commit()
