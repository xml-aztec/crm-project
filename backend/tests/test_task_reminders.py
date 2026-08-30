import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.main import app
from app.models.notification import Notification
from app.models.task import Task
from app.models.user import User
from app.repositories import notification_preference as pref_repo
from app.repositories import task as task_repo
from app.schemas.notification_preference import NotificationChannel
from app.schemas.task import TaskCreate
from app.scheduler.jobs import process_due_reminders
from app.utils.init_notification_types import init_notification_types

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _make_user(db_session, *, email: str | None = None) -> User:
    user = User(
        email=email or f"reminder-test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="not-a-real-hash",
        full_name="Reminder Test User",
        is_active=True,
        is_approved=True,
        salary_base=0,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _make_due_task(db_session, user_id: int, *, seconds_ago: int = 5) -> Task:
    now = datetime.now(timezone.utc)
    task = await task_repo.create_task(
        db_session,
        user_id,
        TaskCreate(
            title="Overdue reminder",
            due_at=now + timedelta(hours=1),
            reminder_at=now - timedelta(seconds=seconds_ago),
        ),
    )
    return task


async def test_claim_due_reminders_marks_sent_and_is_idempotent(db_session):
    user = await _make_user(db_session)
    task = await _make_due_task(db_session, user.id)

    now = datetime.now(timezone.utc)
    first = await task_repo.claim_due_reminders(db_session, now=now)
    assert [t.id for t in first] == [task.id]

    second = await task_repo.claim_due_reminders(db_session, now=now)
    assert second == []

    await db_session.refresh(task)
    assert task.reminder_sent_at is not None


async def test_claim_due_reminders_ignores_future_and_non_pending_tasks(db_session):
    user = await _make_user(db_session)
    now = datetime.now(timezone.utc)

    future_task = await task_repo.create_task(
        db_session,
        user.id,
        TaskCreate(title="Future", due_at=now + timedelta(days=1), reminder_at=now + timedelta(hours=1)),
    )
    from app.schemas.task import TaskStatus

    done_task = await _make_due_task(db_session, user.id)
    await task_repo.set_status(db_session, done_task, TaskStatus.done)

    claimed = await task_repo.claim_due_reminders(db_session, now=now)
    claimed_ids = {t.id for t in claimed}
    assert future_task.id not in claimed_ids
    assert done_task.id not in claimed_ids


async def test_process_due_reminders_is_idempotent_end_to_end(db_session):
    await init_notification_types(db_session)
    user = await _make_user(db_session)
    task = await _make_due_task(db_session, user.id)

    result_first = await process_due_reminders()
    assert result_first["claimed"] == 1
    assert result_first["processed"] == 1
    assert result_first["failed"] == 0

    result_second = await process_due_reminders()
    assert result_second["claimed"] == 0

    notif_count = (
        await db_session.execute(
            select(Notification).where(Notification.type == "task_reminder", Notification.entity_id == task.id)
        )
    ).scalars().all()
    assert len(notif_count) == 1


async def test_email_preference_disabled_suppresses_email_but_keeps_notification(db_session, monkeypatch):
    await init_notification_types(db_session)
    user = await _make_user(db_session)
    await pref_repo.upsert_preference(db_session, user.id, "task_reminder", NotificationChannel.email, False)

    task = await _make_due_task(db_session, user.id)

    sent_emails = []

    async def _fake_send(to_email, task_title, due_at, max_retries=2):
        sent_emails.append(to_email)
        return True

    monkeypatch.setattr("app.scheduler.jobs.send_task_reminder_email", _fake_send)

    result = await process_due_reminders()
    assert result["processed"] == 1
    assert sent_emails == []

    notif = (
        await db_session.execute(
            select(Notification).where(Notification.type == "task_reminder", Notification.entity_id == task.id)
        )
    ).scalar_one_or_none()
    assert notif is not None


async def test_email_preference_enabled_sends_email(db_session, monkeypatch):
    await init_notification_types(db_session)
    user = await _make_user(db_session)
    await pref_repo.upsert_preference(db_session, user.id, "task_reminder", NotificationChannel.email, True)

    await _make_due_task(db_session, user.id)

    sent_emails = []

    async def _fake_send(to_email, task_title, due_at, max_retries=2):
        sent_emails.append(to_email)
        return True

    monkeypatch.setattr("app.scheduler.jobs.send_task_reminder_email", _fake_send)

    await process_due_reminders()
    assert sent_emails == [user.email]


async def test_in_app_preference_disabled_suppresses_notification(db_session):
    await init_notification_types(db_session)
    user = await _make_user(db_session)
    await pref_repo.upsert_preference(db_session, user.id, "task_reminder", NotificationChannel.in_app, False)
    await pref_repo.upsert_preference(db_session, user.id, "task_reminder", NotificationChannel.email, False)

    task = await _make_due_task(db_session, user.id)

    await process_due_reminders()

    notif = (
        await db_session.execute(
            select(Notification).where(Notification.type == "task_reminder", Notification.entity_id == task.id)
        )
    ).scalar_one_or_none()
    assert notif is None


async def test_reminder_processing_endpoint_requires_token(db_session, monkeypatch):
    await init_notification_types(db_session)
    monkeypatch.setattr(settings, "TASK_REMINDER_TOKEN", "test-token-123")

    user = await _make_user(db_session)
    await _make_due_task(db_session, user.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/tasks/reminders/process")
        assert resp.status_code == 422  # заголовок обязателен

        resp = await client.post(
            "/tasks/reminders/process", headers={"X-Reminder-Token": "wrong-token"}
        )
        assert resp.status_code == 403

        resp = await client.post(
            "/tasks/reminders/process", headers={"X-Reminder-Token": "test-token-123"}
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["claimed"] == 1

        # Повторный вызов сразу же — идемпотентность на уровне эндпоинта.
        resp = await client.post(
            "/tasks/reminders/process", headers={"X-Reminder-Token": "test-token-123"}
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["claimed"] == 0
