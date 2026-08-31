import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import get_password_hash
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.rbac.service import sync_rbac_role_for_user
from app.utils.init_roles import init_roles

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _make_user(db_session, role_name: str, *, branch_id=None) -> tuple[User, str]:
    """Реальный пользователь с настоящим bcrypt-хэшем (для логина через
    /auth/login) и синхронизированной RBAC-ролью (нужно для
    user_is_manager_or_admin / require_permission — прямая вставка в БД, в
    отличие от регистрации через API, не синхронизирует RBAC сама по себе)."""
    await init_roles(db_session)
    role = (await db_session.execute(select(Role).where(Role.name == role_name))).scalar_one()
    password = "TestPass123!"
    user = User(
        email=f"return-test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        full_name=f"Return Test {role_name.capitalize()}",
        is_active=True,
        is_approved=True,
        role_id=role.id,
        branch_id=branch_id,
    )
    db_session.add(user)
    await db_session.flush()
    await sync_rbac_role_for_user(user.id, db_session)
    await db_session.commit()
    await db_session.refresh(user)
    return user, password


async def _login_as(email: str, password: str) -> AsyncClient:
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    resp = await client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return client


async def _setup_catalog(admin_client, quantity: int = 10, *, branch_id=None) -> tuple[int, int, int]:
    """Создаёт склад (опционально привязанный к филиалу), товар с остатком
    и клиента. Возвращает (warehouse_id, product_id, customer_id)."""
    suffix = uuid.uuid4().hex[:8]

    resp = await admin_client.post(
        "/warehouses/", json={"name": f"Return Test WH {suffix}", "branch_id": branch_id}
    )
    assert resp.status_code in (200, 201), resp.text
    warehouse_id = resp.json()["id"]

    resp = await admin_client.post(
        "/products/",
        json={
            "name": f"Return Test Product {suffix}",
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

    resp = await admin_client.post("/customers/", json={"name": f"Return Test Customer {suffix}"})
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


async def _create_and_confirm_order(admin_client, *, warehouse_id, customer_id, product_id, quantity):
    resp = await admin_client.post(
        "/orders/",
        json={
            "warehouse_id": warehouse_id,
            "customer_id": customer_id,
            "total_price": str(200 * quantity),
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
    assert resp.status_code == 201, resp.text
    order = resp.json()
    order_id = order["id"]
    order_item_id = order["items"][0]["id"]

    resp = await admin_client.patch(f"/orders/{order_id}/confirm", json={"confirmed": True})
    assert resp.status_code == 200, resp.text

    return order_id, order_item_id


async def test_staff_return_requested_does_not_affect_stock(db_session, admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )
    stock_before = await _get_stock(admin_client, product_id, warehouse_id)

    staff, staff_password = await _make_user(db_session, "staff")
    staff_client = await _login_as(staff.email, staff_password)

    resp = await staff_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "reason": "Не подошёл размер",
            "items": [{"order_item_id": order_item_id, "quantity": 2, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "requested"
    assert body["approved_by"] is None

    stock_after = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock_after["quantity"] == stock_before["quantity"]
    assert stock_after["defective_quantity"] == stock_before["defective_quantity"]

    await staff_client.aclose()


async def test_manager_return_applied_immediately(db_session, admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )
    stock_before = await _get_stock(admin_client, product_id, warehouse_id)

    manager, manager_password = await _make_user(db_session, "manager")
    manager_client = await _login_as(manager.email, manager_password)

    resp = await manager_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 3, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "completed"
    assert body["approved_by"] == manager.id

    stock_after = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock_after["quantity"] == stock_before["quantity"] + 3

    await manager_client.aclose()


async def test_admin_return_applied_immediately(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=4
    )
    stock_before = await _get_stock(admin_client, product_id, warehouse_id)

    resp = await admin_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 1, "condition": "defective"}],
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "completed"

    stock_after = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock_after["quantity"] == stock_before["quantity"]
    assert stock_after["defective_quantity"] == stock_before["defective_quantity"] + 1


async def test_manager_approves_staff_return_applies_stock_effect(db_session, admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )
    stock_before = await _get_stock(admin_client, product_id, warehouse_id)

    staff, staff_password = await _make_user(db_session, "staff")
    staff_client = await _login_as(staff.email, staff_password)
    resp = await staff_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 2, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 201, resp.text
    return_id = resp.json()["id"]

    manager, manager_password = await _make_user(db_session, "manager")
    manager_client = await _login_as(manager.email, manager_password)

    resp = await manager_client.patch(f"/returns/{return_id}/decision", json={"approve": True})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "approved"
    assert body["approved_by"] == manager.id

    stock_after = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock_after["quantity"] == stock_before["quantity"] + 2

    await staff_client.aclose()
    await manager_client.aclose()


async def test_manager_rejects_staff_return_leaves_stock_untouched(db_session, admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )
    stock_before = await _get_stock(admin_client, product_id, warehouse_id)

    staff, staff_password = await _make_user(db_session, "staff")
    staff_client = await _login_as(staff.email, staff_password)
    resp = await staff_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 2, "condition": "defective"}],
        },
    )
    assert resp.status_code == 201, resp.text
    return_id = resp.json()["id"]

    manager, manager_password = await _make_user(db_session, "manager")
    manager_client = await _login_as(manager.email, manager_password)

    resp = await manager_client.patch(
        f"/returns/{return_id}/decision", json={"approve": False, "reason": "Товар не был передан"}
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "rejected"

    stock_after = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock_after["quantity"] == stock_before["quantity"]
    assert stock_after["defective_quantity"] == stock_before["defective_quantity"]

    # Отклонённый возврат не занимает квоту — можно вернуть то же количество снова.
    resp = await staff_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 2, "condition": "defective"}],
        },
    )
    assert resp.status_code == 201, resp.text

    await staff_client.aclose()
    await manager_client.aclose()


async def test_over_return_is_rejected(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )
    stock_before = await _get_stock(admin_client, product_id, warehouse_id)

    # Больше, чем было заказано — сразу отклоняется.
    resp = await admin_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 6, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 400, resp.text

    # Частичный возврат 3 из 5 — ок.
    resp = await admin_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 3, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 201, resp.text

    # Ещё 3 сверху (итого 6 из 5) — отклоняется с учётом уже возвращённого.
    resp = await admin_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 3, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 400, resp.text

    stock_after = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock_after["quantity"] == stock_before["quantity"] + 3


async def test_resalable_vs_defective_stock_effect(admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )
    stock_before = await _get_stock(admin_client, product_id, warehouse_id)

    resp = await admin_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 2, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 201, resp.text

    resp = await admin_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 1, "condition": "defective"}],
        },
    )
    assert resp.status_code == 201, resp.text

    stock_after = await _get_stock(admin_client, product_id, warehouse_id)
    assert stock_after["quantity"] == stock_before["quantity"] + 2
    assert stock_after["defective_quantity"] == stock_before["defective_quantity"] + 1


async def test_return_decision_is_branch_scoped(db_session, admin_client):
    resp = await admin_client.post("/branches/", json={"name": f"Return Test Branch {uuid.uuid4().hex[:8]}"})
    assert resp.status_code in (200, 201), resp.text
    branch_id = resp.json()["id"]

    other_resp = await admin_client.post("/branches/", json={"name": f"Other Branch {uuid.uuid4().hex[:8]}"})
    assert other_resp.status_code in (200, 201), other_resp.text
    other_branch_id = other_resp.json()["id"]

    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10, branch_id=branch_id)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )

    staff, staff_password = await _make_user(db_session, "staff", branch_id=branch_id)
    staff_client = await _login_as(staff.email, staff_password)
    resp = await staff_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 2, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 201, resp.text
    return_id = resp.json()["id"]

    other_manager, other_manager_password = await _make_user(db_session, "manager", branch_id=other_branch_id)
    other_manager_client = await _login_as(other_manager.email, other_manager_password)
    resp = await other_manager_client.patch(f"/returns/{return_id}/decision", json={"approve": True})
    assert resp.status_code == 403, resp.text

    same_branch_manager, same_branch_manager_password = await _make_user(db_session, "manager", branch_id=branch_id)
    same_branch_manager_client = await _login_as(same_branch_manager.email, same_branch_manager_password)
    resp = await same_branch_manager_client.patch(f"/returns/{return_id}/decision", json={"approve": True})
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "approved"

    await staff_client.aclose()
    await other_manager_client.aclose()
    await same_branch_manager_client.aclose()


async def test_order_return_history_visible_regardless_of_filer(db_session, admin_client):
    warehouse_id, product_id, customer_id = await _setup_catalog(admin_client, quantity=10)
    order_id, order_item_id = await _create_and_confirm_order(
        admin_client, warehouse_id=warehouse_id, customer_id=customer_id, product_id=product_id, quantity=5
    )

    staff, staff_password = await _make_user(db_session, "staff")
    staff_client = await _login_as(staff.email, staff_password)
    resp = await staff_client.post(
        "/returns/",
        json={
            "order_id": order_id,
            "items": [{"order_item_id": order_item_id, "quantity": 1, "condition": "resalable"}],
        },
    )
    assert resp.status_code == 201, resp.text

    resp = await admin_client.get("/returns/", params={"order_id": order_id})
    assert resp.status_code == 200, resp.text
    returns = resp.json()
    assert len(returns) == 1
    assert returns[0]["order_id"] == order_id

    resp = await admin_client.get(f"/orders/{order_id}/history")
    assert resp.status_code == 200, resp.text
    actions = {entry["action"] for entry in resp.json()}
    assert "return_requested" in actions

    await staff_client.aclose()
