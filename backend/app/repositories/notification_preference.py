from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_preference import NotificationPreference
from app.models.notification_type import NotificationType
from app.schemas.notification_preference import NotificationChannel, NotificationPreferenceOut


def _default_for_channel(notif_type: NotificationType, channel: NotificationChannel) -> bool:
    if channel == NotificationChannel.email:
        return notif_type.default_email_enabled
    return notif_type.default_in_app_enabled


async def get_effective_preferences(db: AsyncSession, user_id: int) -> list[NotificationPreferenceOut]:
    """Возвращает эффективные (с учётом дефолтов типа) предпочтения пользователя
    по каждому активному типу и каждому каналу — отсутствующая строка в
    notification_preferences означает "использовать дефолт типа", поэтому
    добавление новой строки в notification_types сразу получает разумные
    дефолты для всех пользователей без бэкфилла."""
    types = (
        await db.execute(select(NotificationType).where(NotificationType.is_active == True))
    ).scalars().all()

    existing = (
        await db.execute(
            select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        )
    ).scalars().all()
    existing_by_key = {(p.notification_type_id, p.channel): p.enabled for p in existing}

    result: list[NotificationPreferenceOut] = []
    for notif_type in types:
        for channel in NotificationChannel:
            enabled = existing_by_key.get(
                (notif_type.id, channel), _default_for_channel(notif_type, channel)
            )
            result.append(
                NotificationPreferenceOut(
                    notification_type_code=notif_type.code,
                    notification_type_label=notif_type.label,
                    channel=channel,
                    enabled=enabled,
                )
            )
    return result


async def upsert_preference(
    db: AsyncSession, user_id: int, type_code: str, channel: NotificationChannel, enabled: bool
) -> NotificationPreference:
    notif_type = await db.scalar(select(NotificationType).where(NotificationType.code == type_code))
    if not notif_type:
        raise ValueError(f"Неизвестный тип уведомления: {type_code}")

    pref = await db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.notification_type_id == notif_type.id,
            NotificationPreference.channel == channel,
        )
    )
    if pref:
        pref.enabled = enabled
    else:
        pref = NotificationPreference(
            user_id=user_id, notification_type_id=notif_type.id, channel=channel, enabled=enabled
        )
        db.add(pref)
    await db.commit()
    await db.refresh(pref)
    return pref


async def is_channel_enabled(
    db: AsyncSession, user_id: int, type_code: str, channel: NotificationChannel
) -> bool:
    notif_type = await db.scalar(select(NotificationType).where(NotificationType.code == type_code))
    if not notif_type or not notif_type.is_active:
        return False

    pref = await db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.notification_type_id == notif_type.id,
            NotificationPreference.channel == channel,
        )
    )
    if pref is not None:
        return pref.enabled
    return _default_for_channel(notif_type, channel)
