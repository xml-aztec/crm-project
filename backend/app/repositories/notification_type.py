from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_type import NotificationType


async def get_all_active(db: AsyncSession) -> list[NotificationType]:
    result = await db.execute(
        select(NotificationType).where(NotificationType.is_active == True).order_by(NotificationType.id)
    )
    return list(result.scalars().all())


async def get_by_code(db: AsyncSession, code: str) -> NotificationType | None:
    return await db.scalar(select(NotificationType).where(NotificationType.code == code))
