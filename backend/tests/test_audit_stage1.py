"""Регрессии на критические находки аудита от 2026-09-03 (Этап 1).

Каждый тест здесь падает на коде до исправления — это его единственный смысл.
Ссылки на находки: C1 (отменённые заказы в выручке), C2 (двойной учёт
количества), C3 (чтение чужого заказа).
"""
import uuid
from datetime import date

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import get_password_hash
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.repositories.analytics import get_monthly_target_data
from app.repositories.payroll import get_actual_sales
from app.utils.init_roles import init_roles

pytestmark = pytest.mark.asyncio(loop_scope="session")

UNIT_PRICE = 200
QUANTITY = 5
# final_price — ИТОГ ПО СТРОКЕ, количество в него уже заложено (так его
# считает фронтенд и так его суммирует recalculate_order_total).
LINE_TOTAL = UNIT_PRICE * QUANTITY


async def _make_manager(db_session) -> tuple[User, str]:
    await init_roles(db_session)
    role = (await db_session.execute(select(Role).where(Role.name == "manager"))).scalar_one()
    password = "TestPass123!"
    user = User(
        email=f"stage1-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        full_name="Stage1 Manager",
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


async def _setup_catalog(admin_client, quantity: int = 50) -> tuple[int, int, int]:
    suffix = uuid.uuid4().hex[:8]

    resp = await admin_client.post("/warehouses/", json={"name": f"Stage1 WH {suffix}"})
    assert resp.status_code in (200, 201), resp.text
    warehouse_id = resp.json()["id"]

    resp = await admin_client.post(
        "/products/",
        json={
            "name": f"Stage1 Product {suffix}",
            "description": "test",
            "detail": "",
            "cost_price": 100,
            "price": UNIT_PRICE,
            "category_id": None,
            "subcategory_id": None,
            "brand_id": None,
        },
    )
    assert resp.status_code == 201, resp.text
    product_id = resp.json()["id"]

    resp = await admin_client.post(
        "/stock/",
        json={"product_id": product_id, "warehouse_id": warehouse_id, "quantity": quantity},
    )
    assert resp.status_code == 200, resp.text

    resp = await admin_client.post("/customers/", json={"name": f"Stage1 Customer {suffix}"})
    assert resp.status_code == 201, resp.text
    customer_id = resp.json()["id"]

    return warehouse_id, product_id, customer_id


async def _create_order(client, *, warehouse_id, customer_id, product_id, quantity=QUANTITY):
    resp = await client.post(
        "/orders/",
        json={
            "warehouse_id": warehouse_id,
            "customer_id": customer_id,
            "total_price": str(UNIT_PRICE * quantity),
            "items": [
                {
                    "product_id": product_id,
                    "quantity": quantity,
                    "unit_price": UNIT_PRICE,
                    "final_price": UNIT_PRICE * quantity,
                }
            ],
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _cancelled_status_id(admin_client) -> int:
    resp = await admin_client.get("/order-statuses/")
    assert resp.status_code == 200, resp.text
    return {s["name"]: s["id"] for s in resp.json()}["Отменен"]


# --------------------------------------------------------------------------
# C1 — подтверждённый и затем отменённый заказ не должен оставаться в выручке
# --------------------------------------------------------------------------


async def test_cancelled_order_leaves_payroll_sales(admin_client, db_session):
    """До исправления отмена возвращала товар на склад, но `confirmed`
    оставался True, а get_actual_sales фильтровал только по нему — выручка по
    отменённому заказу навсегда оставалась в базе для расчёта бонуса."""
    manager, password = await _make_manager(db_session)
    manager_client = await _login_as(manager.email, password)
    try:
        warehouse_id, product_id, customer_id = await _setup_catalog(admin_client)
        month = date.today().strftime("%Y-%m")

        before = await get_actual_sales(db_session, manager.id, month)

        order_id = await _create_order(
            manager_client,
            warehouse_id=warehouse_id,
            customer_id=customer_id,
            product_id=product_id,
        )
        resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
        assert resp.status_code == 200, resp.text

        confirmed_sales = await get_actual_sales(db_session, manager.id, month)
        assert confirmed_sales > before, "подтверждённый заказ обязан попасть в выручку"

        cancelled_id = await _cancelled_status_id(admin_client)
        resp = await admin_client.patch(
            f"/orders/{order_id}/status",
            json={"status_id": cancelled_id, "cancellation_reason": "Регрессия C1"},
        )
        assert resp.status_code == 200, resp.text

        after_cancel = await get_actual_sales(db_session, manager.id, month)
        assert after_cancel == before, (
            "отменённый заказ не должен учитываться в выручке для зарплаты "
            f"(было {before}, стало {after_cancel})"
        )
    finally:
        await manager_client.aclose()


async def test_cancelled_order_leaves_manager_kpi(admin_client, db_session):
    """Тот же сценарий на личном KPI менеджера — эта выборка вообще не
    фильтровала заказы, засчитывая и неподтверждённые, и отменённые."""
    manager, password = await _make_manager(db_session)
    manager_client = await _login_as(manager.email, password)
    try:
        warehouse_id, product_id, customer_id = await _setup_catalog(admin_client)

        order_id = await _create_order(
            manager_client,
            warehouse_id=warehouse_id,
            customer_id=customer_id,
            product_id=product_id,
        )

        # Неподтверждённый заказ не должен формировать KPI.
        data = await get_monthly_target_data(db_session, manager.id)
        assert float(data["revenue"]) == 0

        resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
        assert resp.status_code == 200, resp.text
        data = await get_monthly_target_data(db_session, manager.id)
        assert float(data["revenue"]) == LINE_TOTAL

        cancelled_id = await _cancelled_status_id(admin_client)
        resp = await admin_client.patch(
            f"/orders/{order_id}/status",
            json={"status_id": cancelled_id, "cancellation_reason": "Регрессия C1"},
        )
        assert resp.status_code == 200, resp.text

        data = await get_monthly_target_data(db_session, manager.id)
        assert float(data["revenue"]) == 0, "отменённый заказ не должен держаться в KPI"
    finally:
        await manager_client.aclose()


# --------------------------------------------------------------------------
# C2 — выручка равна сумме final_price, количество не умножается повторно
# --------------------------------------------------------------------------


async def test_revenue_does_not_multiply_quantity_twice(admin_client, db_session):
    """final_price уже содержит количество. До исправления KPI/план-факт/
    таблица лидеров считали SUM(final_price * quantity) и завышали выручку
    ровно в `quantity` раз — здесь это была бы разница 1000 против 5000."""
    manager, password = await _make_manager(db_session)
    manager_client = await _login_as(manager.email, password)
    try:
        warehouse_id, product_id, customer_id = await _setup_catalog(admin_client)

        order_id = await _create_order(
            manager_client,
            warehouse_id=warehouse_id,
            customer_id=customer_id,
            product_id=product_id,
            quantity=QUANTITY,
        )
        resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
        assert resp.status_code == 200, resp.text

        data = await get_monthly_target_data(db_session, manager.id)
        assert float(data["revenue"]) == LINE_TOTAL, (
            f"ожидали {LINE_TOTAL} (сумма итогов строк), получили {data['revenue']}; "
            f"{LINE_TOTAL * QUANTITY} означало бы повторное умножение на количество"
        )
    finally:
        await manager_client.aclose()


# --------------------------------------------------------------------------
# C3 — заказ читает только его владелец или админ
# --------------------------------------------------------------------------


async def test_manager_cannot_read_another_users_order(admin_client, db_session):
    """До исправления проверка была инвертирована: GET /orders/{id} отдавал
    любой чужой заказ любому авторизованному пользователю."""
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client)
    foreign_order_id = await _create_order(
        admin_client,
        warehouse_id=warehouse_id,
        customer_id=customer_id,
        product_id=product_id,
    )

    manager, password = await _make_manager(db_session)
    manager_client = await _login_as(manager.email, password)
    try:
        resp = await manager_client.get(f"/orders/{foreign_order_id}")
        assert resp.status_code == 403, (
            f"чужой заказ не должен читаться, получили {resp.status_code}: {resp.text}"
        )
    finally:
        await manager_client.aclose()


async def test_manager_can_read_own_order(admin_client, db_session):
    """Обратная сторона той же инверсии: собственный заказ обязан открываться."""
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client)

    manager, password = await _make_manager(db_session)
    manager_client = await _login_as(manager.email, password)
    try:
        own_order_id = await _create_order(
            manager_client,
            warehouse_id=warehouse_id,
            customer_id=customer_id,
            product_id=product_id,
        )
        resp = await manager_client.get(f"/orders/{own_order_id}")
        assert resp.status_code == 200, resp.text
        assert resp.json()["id"] == own_order_id
    finally:
        await manager_client.aclose()
