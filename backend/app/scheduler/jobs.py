from datetime import datetime, timezone

import structlog

from app.core.database import SessionLocal
from app.repositories import notification as notif_repo
from app.repositories import notification_preference as pref_repo
from app.repositories import task as task_repo
from app.repositories import user as user_repo
from app.schemas.notification_preference import NotificationChannel
from app.utils.email import send_task_reminder_email

logger = structlog.get_logger()

TASK_REMINDER_TYPE = "task_reminder"


async def process_due_reminders(now: datetime | None = None) -> dict:
    """Единая функция обработки напоминаний — вызывается и планировщиком
    (интервал, см. main.py::lifespan), и служебным эндпоинтом
    POST /tasks/reminders/process (см. api/tasks.py). Не использует
    request-scoped get_db — открывает собственную сессию, т.к. может
    выполняться вне цикла HTTP-запрос/ответ."""
    now = now or datetime.now(timezone.utc)
    claimed = 0
    processed = 0
    failed = 0

    async with SessionLocal() as db:
        tasks = await task_repo.claim_due_reminders(db, now=now)
        claimed = len(tasks)

        for task in tasks:
            try:
                if await pref_repo.is_channel_enabled(
                    db, task.user_id, TASK_REMINDER_TYPE, NotificationChannel.in_app
                ):
                    await notif_repo.create_notification(
                        db,
                        user_id=task.user_id,
                        title=f"Напоминание: {task.title}",
                        message=f"Срок: {task.due_at:%d.%m.%Y %H:%M}",
                        type=TASK_REMINDER_TYPE,
                        entity_id=task.id,
                    )

                if await pref_repo.is_channel_enabled(
                    db, task.user_id, TASK_REMINDER_TYPE, NotificationChannel.email
                ):
                    user = await user_repo.get_user_by_id(db, task.user_id)
                    if user and user.email:
                        await send_task_reminder_email(user.email, task.title, task.due_at)

                processed += 1
            except Exception:
                logger.exception("task_reminder_processing_failed", task_id=task.id)
                failed += 1

    return {"claimed": claimed, "processed": processed, "failed": failed}
