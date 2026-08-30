from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.models.role import Role


async def get_user_notifications(db: AsyncSession, user_id: int, limit: int = 30) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_paginated(
    db: AsyncSession, user_id: int, page: int = 1, page_size: int = 20
) -> tuple[list[Notification], int, int]:
    total = await db.scalar(
        select(func.count(Notification.id)).where(Notification.user_id == user_id)
    )
    total = total or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = list(result.scalars().all())
    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages


async def get_unread_count(db: AsyncSession, user_id: int) -> int:
    count = await db.scalar(
        select(func.count(Notification.id))
        .where(Notification.user_id == user_id, Notification.is_read == False)
    )
    return count or 0


async def mark_read(db: AsyncSession, notification_id: int, user_id: int) -> Notification | None:
    notif = await db.scalar(
        select(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user_id)
    )
    if notif:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        await db.commit()
    return notif


async def mark_all_read(db: AsyncSession, user_id: int) -> None:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
    )
    now = datetime.now(timezone.utc)
    for notif in result.scalars().all():
        notif.is_read = True
        notif.read_at = now
    await db.commit()


async def create_notification(
    db: AsyncSession,
    user_id: int,
    title: str,
    message: str | None = None,
    type: str | None = None,
    entity_id: int | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        entity_id=entity_id,
    )
    db.add(notif)
    await db.commit()
    return notif


async def notify_admins(
    db: AsyncSession,
    title: str,
    message: str | None = None,
    type: str | None = None,
    entity_id: int | None = None,
) -> None:
    admin_ids_result = await db.execute(
        select(User.id).join(Role, User.role_id == Role.id).where(Role.name == "admin", User.is_active == True)
    )
    admin_ids = list(admin_ids_result.scalars().all())
    for admin_id in admin_ids:
        db.add(Notification(user_id=admin_id, title=title, message=message, type=type, entity_id=entity_id))
    if admin_ids:
        await db.commit()
