import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import get_password_hash
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.utils.init_roles import init_roles

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _make_manager(db_session) -> tuple[User, str]:
    await init_roles(db_session)
    role = (await db_session.execute(select(Role).where(Role.name == "manager"))).scalar_one()
    password = "TestPass123!"
    user = User(
        email=f"task-test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        full_name="Task Test Manager",
        is_active=True,
        is_approved=True,
        role_id=role.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user, password


async def _login_as(email: str, password: str) -> AsyncClient:
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    resp = await client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return client


def _iso(delta: timedelta) -> str:
    return (datetime.now(timezone.utc) + delta).isoformat()


async def _create_task(client: AsyncClient, **overrides) -> dict:
    payload = {
        "title": "Позвонить клиенту",
        "due_at": _iso(timedelta(hours=1)),
        **overrides,
    }
    resp = await client.post("/tasks", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_task_via_api(db_session):
    owner, password = await _make_manager(db_session)
    client = await _login_as(owner.email, password)

    task = await _create_task(client, title="Test create", description="note")
    assert task["title"] == "Test create"
    assert task["status"] == "pending"
    assert task["user_id"] == owner.id

    await client.aclose()


async def test_list_tasks_paginated_and_filtered(db_session):
    owner, password = await _make_manager(db_session)
    client = await _login_as(owner.email, password)

    await _create_task(client, title="A", due_at=_iso(timedelta(days=1)))
    done_task = await _create_task(client, title="B", due_at=_iso(timedelta(days=2)))
    await client.patch(f"/tasks/{done_task['id']}/status", json={"status": "done"})

    resp = await client.get("/tasks", params={"page": 1, "page_size": 20})
    assert resp.status_code == 200, resp.text
    page = resp.json()
    assert {"items", "total", "page", "page_size", "total_pages"} <= page.keys()
    assert page["total"] >= 2

    resp = await client.get("/tasks", params={"status": "done"})
    assert resp.status_code == 200, resp.text
    assert all(t["status"] == "done" for t in resp.json()["items"])

    await client.aclose()


async def test_update_task_reschedules_and_resets_reminder_sent_at(db_session):
    owner, password = await _make_manager(db_session)
    client = await _login_as(owner.email, password)

    due = _iso(timedelta(seconds=2))
    task = await _create_task(client, due_at=due, reminder_at=due)

    from app.models.task import Task

    db_task = await db_session.get(Task, task["id"])
    db_task.reminder_sent_at = datetime.now(timezone.utc)
    await db_session.commit()

    new_due = _iso(timedelta(days=1))
    resp = await client.patch(f"/tasks/{task['id']}", json={"due_at": new_due, "reminder_at": new_due})
    assert resp.status_code == 200, resp.text

    await db_session.refresh(db_task)
    assert db_task.reminder_sent_at is None

    await client.aclose()


async def test_update_task_status_inline(db_session):
    owner, password = await _make_manager(db_session)
    client = await _login_as(owner.email, password)

    task = await _create_task(client)
    resp = await client.patch(f"/tasks/{task['id']}/status", json={"status": "cancelled"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "cancelled"

    await client.aclose()


async def test_delete_task(db_session):
    owner, password = await _make_manager(db_session)
    client = await _login_as(owner.email, password)

    task = await _create_task(client)
    resp = await client.delete(f"/tasks/{task['id']}")
    assert resp.status_code == 204, resp.text

    resp = await client.get(f"/tasks/{task['id']}")
    assert resp.status_code == 404

    await client.aclose()


async def test_task_ownership_is_enforced(db_session, admin_client):
    owner, owner_password = await _make_manager(db_session)
    other, other_password = await _make_manager(db_session)

    owner_client = await _login_as(owner.email, owner_password)
    other_client = await _login_as(other.email, other_password)

    task = await _create_task(owner_client)
    task_id = task["id"]

    resp = await other_client.get(f"/tasks/{task_id}")
    assert resp.status_code == 403, resp.text

    resp = await other_client.patch(f"/tasks/{task_id}/status", json={"status": "done"})
    assert resp.status_code == 403, resp.text

    resp = await other_client.delete(f"/tasks/{task_id}")
    assert resp.status_code == 403, resp.text

    resp = await admin_client.get(f"/tasks/{task_id}")
    assert resp.status_code == 200, resp.text

    resp = await owner_client.get(f"/tasks/{task_id}")
    assert resp.status_code == 200, resp.text

    await owner_client.aclose()
    await other_client.aclose()


async def test_admin_can_filter_tasks_by_user_id(db_session, admin_client):
    owner, owner_password = await _make_manager(db_session)
    owner_client = await _login_as(owner.email, owner_password)

    await _create_task(owner_client, title="Owner-only task")

    resp = await admin_client.get("/tasks", params={"user_id": owner.id})
    assert resp.status_code == 200, resp.text
    items = resp.json()["items"]
    assert len(items) >= 1
    assert all(t["user_id"] == owner.id for t in items)

    # Не-админ не может воспользоваться чужим user_id — фильтр молча игнорируется,
    # свою же задачу создаём, чтобы проверка не была тривиально верна на пустом списке.
    other, other_password = await _make_manager(db_session)
    other_client = await _login_as(other.email, other_password)
    await _create_task(other_client, title="Other manager's own task")

    resp = await other_client.get("/tasks", params={"user_id": owner.id})
    assert resp.status_code == 200, resp.text
    items = resp.json()["items"]
    assert len(items) >= 1
    assert all(t["user_id"] == other.id for t in items)

    await owner_client.aclose()
    await other_client.aclose()


async def test_task_linked_to_customer_and_order(db_session, admin_client):
    owner, password = await _make_manager(db_session)
    client = await _login_as(owner.email, password)

    suffix = uuid.uuid4().hex[:8]
    resp = await admin_client.post(
        "/customers/", json={"name": f"Task Customer {suffix}", "phone": f"+996700{suffix[:6]}"}
    )
    assert resp.status_code == 201, resp.text
    customer_id = resp.json()["id"]

    task = await _create_task(client, customer_id=customer_id)
    assert task["customer_id"] == customer_id

    resp = await client.get("/tasks", params={"customer_id": customer_id})
    assert resp.status_code == 200, resp.text
    assert len(resp.json()["items"]) == 1

    await client.aclose()
