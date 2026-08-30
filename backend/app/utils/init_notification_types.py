from sqlalchemy import select

from app.models.notification_type import NotificationType

DEFAULT_NOTIFICATION_TYPES = [
    {"code": "task_reminder", "label": "Напоминание о задаче"},
]


async def init_notification_types(db):
    for entry in DEFAULT_NOTIFICATION_TYPES:
        result = await db.execute(
            select(NotificationType).where(NotificationType.code == entry["code"])
        )
        if not result.scalar_one_or_none():
            db.add(NotificationType(code=entry["code"], label=entry["label"]))
    await db.commit()
