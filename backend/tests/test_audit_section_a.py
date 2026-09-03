"""Регрессии на находки раздела A аудита от 2026-09-03.

Покрывает: M8 (отзыв JWT через token_version), H5 (заказы без клиента),
M3 (правило KPI с бонусом и штрафом), H2 (запрет отрицательных остатков).
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text

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
        email=f"sec-a-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        full_name="Section A Manager",
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


# --------------------------------------------------------------------------
# M8 — смена пароля обрывает ранее выданные токены
# --------------------------------------------------------------------------


async def test_password_change_revokes_existing_session(db_session):
    """Раньше токен жил свои 60 минут независимо ни от чего: смена пароля не
    делала украденную сессию недействительной."""
    user, password = await _make_manager(db_session)
    client = await _login_as(user.email, password)
    try:
        # Сессия рабочая.
        resp = await client.get("/users/me")
        assert resp.status_code == 200, resp.text

        resp = await client.patch(
            "/users/me/password",
            json={"current_password": password, "new_password": "BrandNewPass456!"},
        )
        assert resp.status_code == 200, resp.text

        # Тот же cookie-токен после смены пароля обязан перестать работать.
        resp = await client.get("/users/me")
        assert resp.status_code == 401, (
            f"старый токен должен отзываться, получили {resp.status_code}"
        )
    finally:
        await client.aclose()


async def test_login_with_new_password_works_after_revocation(db_session):
    """Обратная проверка: отзыв не ломает вход по новому паролю."""
    user, password = await _make_manager(db_session)
    client = await _login_as(user.email, password)
    try:
        new_password = "BrandNewPass456!"
        resp = await client.patch(
            "/users/me/password",
            json={"current_password": password, "new_password": new_password},
        )
        assert resp.status_code == 200, resp.text
    finally:
        await client.aclose()

    fresh = await _login_as(user.email, new_password)
    try:
        resp = await fresh.get("/users/me")
        assert resp.status_code == 200, resp.text
    finally:
        await fresh.aclose()


# --------------------------------------------------------------------------
# H5 — заказ без клиента остаётся виден в списке
# --------------------------------------------------------------------------


async def test_order_without_customer_stays_in_list(admin_client, db_session):
    """Внутренний join по клиенту выбрасывал из выборки заказы с
    customer_id = NULL — то есть ровно те, что остаются после удаления
    клиента (FK ondelete=SET NULL)."""
    suffix = uuid.uuid4().hex[:8]

    resp = await admin_client.post("/warehouses/", json={"name": f"H5 WH {suffix}"})
    warehouse_id = resp.json()["id"]
    resp = await admin_client.post(
        "/products/",
        json={
            "name": f"H5 Product {suffix}", "description": "", "detail": "",
            "cost_price": 100, "price": 200,
            "category_id": None, "subcategory_id": None, "brand_id": None,
        },
    )
    product_id = resp.json()["id"]
    await admin_client.post(
        "/stock/",
        json={"product_id": product_id, "warehouse_id": warehouse_id, "quantity": 10},
    )
    resp = await admin_client.post("/customers/", json={"name": f"H5 Customer {suffix}"})
    customer_id = resp.json()["id"]

    resp = await admin_client.post(
        "/orders/",
        json={
            "warehouse_id": warehouse_id,
            "customer_id": customer_id,
            "total_price": "200",
            "items": [{
                "product_id": product_id, "quantity": 1,
                "unit_price": 200, "final_price": 200,
            }],
        },
    )
    assert resp.status_code == 201, resp.text
    order_id = resp.json()["id"]

    # Отвязываем клиента ровно так, как это делает FK при его удалении.
    await db_session.execute(
        text("UPDATE orders SET customer_id = NULL WHERE id = :oid"), {"oid": order_id}
    )
    await db_session.commit()

    # Запрос с фильтром — именно тот случай, где раньше срабатывал join.
    resp = await admin_client.get("/orders/", params={"limit": 100, "skip": 0})
    assert resp.status_code == 200, resp.text
    listed = [o["id"] for o in resp.json()]
    assert order_id in listed, "заказ без клиента пропал из списка"


# --------------------------------------------------------------------------
# M3 — правило KPI не может нести бонус и штраф одновременно
# --------------------------------------------------------------------------


async def test_kpi_rule_rejects_bonus_and_penalty_together(admin_client):
    resp = await admin_client.post(
        "/kpi-rules/", json={"min_percent": 90, "bonus": 10, "penalty": 5}
    )
    assert resp.status_code == 422, (
        f"правило с бонусом и штрафом сразу должно отклоняться, получили {resp.status_code}"
    )


async def test_kpi_rule_penalty_only_is_allowed(admin_client):
    """Правило только со штрафом обязано создаваться: именно на нём расчёт
    зарплаты раньше падал с TypeError (`None > 0`)."""
    resp = await admin_client.post(
        "/kpi-rules/", json={"min_percent": 41.5, "penalty": 5}
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["penalty"] == 5
    assert not resp.json().get("bonus")


# --------------------------------------------------------------------------
# H2 — БД не даёт увести остаток в минус
# --------------------------------------------------------------------------


async def test_database_rejects_negative_stock(db_session):
    """Последний рубеж: даже в обход кода приложения отрицательный остаток
    не должен попадать в таблицу."""
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                "INSERT INTO product_stock (product_id, warehouse_id, quantity, "
                "reserved, defective_quantity) VALUES (NULL, NULL, -1, 0, 0)"
            )
        )
        await db_session.commit()
    await db_session.rollback()


# --------------------------------------------------------------------------
# H3 — цену позиции определяет сервер, а не клиент
# --------------------------------------------------------------------------


async def test_client_supplied_price_is_ignored(admin_client):
    """Клиент присылает final_price = 1 на заказ из 5 штук по 200 — сервер
    обязан посчитать 1000 по каталогу и проигнорировать присланное."""
    suffix = uuid.uuid4().hex[:8]

    resp = await admin_client.post("/warehouses/", json={"name": f"H3 WH {suffix}"})
    warehouse_id = resp.json()["id"]
    resp = await admin_client.post(
        "/products/",
        json={
            "name": f"H3 Product {suffix}", "description": "", "detail": "",
            "cost_price": 100, "price": 200,
            "category_id": None, "subcategory_id": None, "brand_id": None,
        },
    )
    product_id = resp.json()["id"]
    await admin_client.post(
        "/stock/",
        json={"product_id": product_id, "warehouse_id": warehouse_id, "quantity": 10},
    )
    resp = await admin_client.post("/customers/", json={"name": f"H3 Customer {suffix}"})
    customer_id = resp.json()["id"]

    resp = await admin_client.post(
        "/orders/",
        json={
            "warehouse_id": warehouse_id,
            "customer_id": customer_id,
            "total_price": "1",
            "items": [{
                "product_id": product_id,
                "quantity": 5,
                # Заведомо жульнические значения от клиента.
                "unit_price": 1,
                "final_price": 1,
            }],
        },
    )
    assert resp.status_code == 201, resp.text
    item = resp.json()["items"][0]
    assert float(item["unit_price"]) == 200, "unit_price обязан браться из каталога"
    assert float(item["final_price"]) == 1000, (
        f"final_price должен быть 200*5=1000, получено {item['final_price']}"
    )


async def test_quantity_change_recalculates_line_total(admin_client):
    """Изменение количества позиции обязано пересчитывать итог строки —
    раньше final_price оставался от прежнего количества."""
    suffix = uuid.uuid4().hex[:8]

    resp = await admin_client.post("/warehouses/", json={"name": f"H3b WH {suffix}"})
    warehouse_id = resp.json()["id"]
    resp = await admin_client.post(
        "/products/",
        json={
            "name": f"H3b Product {suffix}", "description": "", "detail": "",
            "cost_price": 50, "price": 100,
            "category_id": None, "subcategory_id": None, "brand_id": None,
        },
    )
    product_id = resp.json()["id"]
    await admin_client.post(
        "/stock/",
        json={"product_id": product_id, "warehouse_id": warehouse_id, "quantity": 20},
    )
    resp = await admin_client.post("/customers/", json={"name": f"H3b Customer {suffix}"})
    customer_id = resp.json()["id"]

    resp = await admin_client.post(
        "/orders/",
        json={
            "warehouse_id": warehouse_id, "customer_id": customer_id,
            "total_price": "200",
            "items": [{"product_id": product_id, "quantity": 2}],
        },
    )
    assert resp.status_code == 201, resp.text
    order = resp.json()
    order_id, item_id = order["id"], order["items"][0]["id"]
    assert float(order["items"][0]["final_price"]) == 200

    resp = await admin_client.patch(
        f"/orders/{order_id}/items/{item_id}", json={"quantity": 7}
    )
    assert resp.status_code == 200, resp.text
    assert float(resp.json()["final_price"]) == 700, (
        f"итог строки должен стать 100*7=700, получено {resp.json()['final_price']}"
    )
