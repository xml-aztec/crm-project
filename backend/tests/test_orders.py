import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import get_password_hash
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.utils.init_roles import init_roles

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _make_manager(db_session, *, branch_id=None) -> tuple[User, str]:
    """Реальный пользователь-менеджер (с настоящим bcrypt-хэшем), чтобы можно
    было залогиниться через /auth/login, а не только оперировать в БД напрямую."""
    await init_roles(db_session)
    role = (await db_session.execute(select(Role).where(Role.name == "manager"))).scalar_one()
    password = "TestPass123!"
    user = User(
        email=f"order-test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        full_name="Order Test Manager",
        is_active=True,
        is_approved=True,
        role_id=role.id,
        branch_id=branch_id,
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


async def _setup_catalog(admin_client, quantity: int = 10) -> tuple[int, int, int]:
    """Создаёт склад, товар с остатком и клиента. Возвращает (warehouse_id, product_id, customer_id)."""
    suffix = uuid.uuid4().hex[:8]

    resp = await admin_client.post("/warehouses/", json={"name": f"Test WH {suffix}"})
    assert resp.status_code in (200, 201), resp.text
    warehouse_id = resp.json()["id"]

    resp = await admin_client.post(
        "/products/",
        json={
            "name": f"Test Product {suffix}",
            "description": "test",
            "detail": "",
            "cost_price": 100,
            "price": 200,
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

    resp = await admin_client.post("/customers/", json={"name": f"Test Customer {suffix}"})
    assert resp.status_code == 201, resp.text
    customer_id = resp.json()["id"]

    return warehouse_id, product_id, customer_id


async def _get_stock(admin_client, product_id: int, warehouse_id: int) -> dict:
    resp = await admin_client.get(
        "/stock/", params={"product_id": product_id, "warehouse_id": warehouse_id}
    )
    assert resp.status_code == 200, resp.text
    stocks = resp.json()["stocks"]
    assert len(stocks) == 1
    return stocks[0]


async def _create_order(client, *, warehouse_id, customer_id, product_id, quantity):
    return await client.post(
        "/orders/",
        json={
            "warehouse_id": warehouse_id,
            "customer_id": customer_id,
            "total_price": "200",
            "items": [
                {
                    "product_id": product_id,
                    "quantity": quantity,
                    "unit_price": 200,
                    "final_price": 200 * quantity,
                }
            ],
        },
    )


async def _cancelled_status_id(admin_client) -> int:
    resp = await admin_client.get("/order-statuses/")
    assert resp.status_code == 200, resp.text
    statuses = {s["name"]: s["id"] for s in resp.json()}
    return statuses["Отменен"]


async def test_create_order_reserves_stock(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)

    resp = await _create_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=3
    )
    assert resp.status_code == 201, resp.text

    stock = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock["quantity"] == 10
    assert stock["reserved"] == 3


async def test_create_order_insufficient_stock_rejected(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=2)

    resp = await _create_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )
    assert resp.status_code == 400, resp.text

    stock = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock["quantity"] == 2
    assert stock["reserved"] == 0


async def test_confirm_order_deducts_stock_and_unconfirm_restores_it(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    resp = await _create_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=4
    )
    order_id = resp.json()["id"]

    resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
    assert resp.status_code == 200, resp.text
    assert resp.json()["confirmed"] is True

    stock = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock["quantity"] == 6
    assert stock["reserved"] == 0

    resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": False})
    assert resp.status_code == 200, resp.text
    assert resp.json()["confirmed"] is False

    stock = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock["quantity"] == 10
    assert stock["reserved"] == 4


async def test_cancel_unconfirmed_order_releases_reservation(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    resp = await _create_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )
    order_id = resp.json()["id"]

    cancelled_id = await _cancelled_status_id(admin_client)
    resp = await admin_client.patch(
        f"/orders/{order_id}/status",
        json={"status_id": cancelled_id, "cancellation_reason": "Клиент передумал"},
    )
    assert resp.status_code == 200, resp.text

    stock = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock["quantity"] == 10
    assert stock["reserved"] == 0


async def test_cancel_confirmed_order_restores_stock(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    resp = await _create_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=6
    )
    order_id = resp.json()["id"]
    resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
    assert resp.status_code == 200, resp.text

    cancelled_id = await _cancelled_status_id(admin_client)
    resp = await admin_client.patch(
        f"/orders/{order_id}/status",
        json={"status_id": cancelled_id, "cancellation_reason": "Брак"},
    )
    assert resp.status_code == 200, resp.text

    stock = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock["quantity"] == 10
    assert stock["reserved"] == 0


async def test_delete_confirmed_order_restores_stock(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    resp = await _create_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=7
    )
    order_id = resp.json()["id"]
    resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
    assert resp.status_code == 200, resp.text

    resp = await admin_client.delete(f"/orders/{order_id}")
    assert resp.status_code == 204, resp.text

    stock = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock["quantity"] == 10
    assert stock["reserved"] == 0


async def test_delete_unconfirmed_order_releases_reservation(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    resp = await _create_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=2
    )
    order_id = resp.json()["id"]

    resp = await admin_client.delete(f"/orders/{order_id}")
    assert resp.status_code == 204, resp.text

    stock = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock["quantity"] == 10
    assert stock["reserved"] == 0


async def test_order_ownership_is_enforced(db_session, admin_client):
    """Один прогон, два менеджерских логина (лимит /auth/login — 5/мин, экономим попытки):
    чужой менеджер не может трогать заказ, владелец и админ — могут."""
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)

    owner, owner_password = await _make_manager(db_session)
    other, other_password = await _make_manager(db_session)

    owner_client = await _login_as(owner.email, owner_password)
    other_client = await _login_as(other.email, other_password)

    resp = await _create_order(
        owner_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=1
    )
    assert resp.status_code == 201, resp.text
    order_id = resp.json()["id"]

    # Другой менеджер (не владелец, не админ) не должен иметь доступа к чужому заказу.
    resp = await other_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
    assert resp.status_code == 403, resp.text

    cancelled_id = await _cancelled_status_id(admin_client)
    resp = await other_client.patch(
        f"/orders/{order_id}/status",
        json={"status_id": cancelled_id, "cancellation_reason": "Пробую чужой заказ"},
    )
    assert resp.status_code == 403, resp.text

    resp = await other_client.post(
        f"/orders/{order_id}/items",
        json={"product_id": product_id, "quantity": 1, "unit_price": 200, "final_price": 200},
    )
    assert resp.status_code == 403, resp.text

    # Админ может подтвердить чужой заказ.
    resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
    assert resp.status_code == 200, resp.text

    # Сам владелец по-прежнему может снять подтверждение своего заказа.
    resp = await owner_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": False})
    assert resp.status_code == 200, resp.text

    await owner_client.aclose()
    await other_client.aclose()
