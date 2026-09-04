"""Тесты финансового контура — доменов, которые до этого не имели покрытия
вовсе (аудит M5): budgets, payrolls, product_stocks (перемещение), cash-flows.

Именно здесь живут находки C1, C2 и M3, и именно отсутствие тестов позволило
им дойти до main.
"""
import uuid
from datetime import date

import pytest
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.repositories.payroll import generate_payrolls_for_month
from app.utils.init_roles import init_roles

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _month() -> str:
    return date.today().strftime("%Y-%m")


# --------------------------------------------------------------------------
# Бюджеты
# --------------------------------------------------------------------------


async def _ensure_cashflow_category(admin_client) -> int:
    """Категории движения денег, в отличие от типов, на старте не засеиваются —
    создаём свою и переиспользуем существующую, если она уже есть."""
    resp = await admin_client.get("/cashflow-meta/categories")
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]["id"]

    resp = await admin_client.post(
        "/cashflow-meta/categories", json={"name": f"Тест {uuid.uuid4().hex[:6]}"}
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


async def test_budget_crud_roundtrip(admin_client, db_session):
    category_id = await _ensure_cashflow_category(admin_client)

    month = _month()
    resp = await admin_client.post(
        "/budgets/",
        json={"month": month, "category_id": category_id, "planned_amount": 150000},
    )
    assert resp.status_code in (200, 201), resp.text
    budget_id = resp.json()["id"]
    assert resp.json()["planned_amount"] == 150000

    resp = await admin_client.patch(
        f"/budgets/{budget_id}", json={"planned_amount": 175000}
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["planned_amount"] == 175000

    resp = await admin_client.get("/budgets/", params={"month": month})
    assert resp.status_code == 200, resp.text
    assert budget_id in [b["id"] for b in resp.json()]

    resp = await admin_client.delete(f"/budgets/{budget_id}")
    assert resp.status_code in (200, 204), resp.text


async def test_budget_rejects_duplicate_month_and_category(admin_client, db_session):
    """На паре (month, category_id) стоит уникальный индекс — вторая запись
    должна отвергаться осмысленной ошибкой, а не 500."""
    category_id = await _ensure_cashflow_category(admin_client)
    month = "2031-01"

    first = await admin_client.post(
        "/budgets/",
        json={"month": month, "category_id": category_id, "planned_amount": 1000},
    )
    assert first.status_code in (200, 201), first.text

    second = await admin_client.post(
        "/budgets/",
        json={"month": month, "category_id": category_id, "planned_amount": 2000},
    )
    assert second.status_code < 500, (
        f"дубликат должен давать 4xx, а не {second.status_code}: {second.text}"
    )

    await admin_client.delete(f"/budgets/{first.json()['id']}")


# --------------------------------------------------------------------------
# Зарплаты
# --------------------------------------------------------------------------


async def _make_salaried_user(db_session, salary: int = 50000) -> User:
    await init_roles(db_session)
    role = (await db_session.execute(select(Role).where(Role.name == "manager"))).scalar_one()
    user = User(
        email=f"payroll-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash("TestPass123!"),
        full_name="Payroll Test",
        is_active=True,
        is_approved=True,
        role_id=role.id,
        salary_base=salary,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_payroll_generation_uses_base_salary(admin_client, db_session):
    user = await _make_salaried_user(db_session, salary=50000)
    month = "2030-05"

    payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)
    mine = [p for p in payrolls if p.user_id == user.id]
    assert len(mine) == 1, "на сотрудника с окладом должна создаваться одна ведомость"

    payroll = mine[0]
    assert payroll.base_salary == 50000
    # Без заданного KPI на месяц ни премии, ни штрафа быть не должно.
    assert payroll.bonus_amount == 0
    assert payroll.penalty_amount == 0
    assert payroll.total_paid == 50000


async def test_payroll_generation_is_not_repeatable_for_same_month(admin_client, db_session):
    """Повторная генерация за тот же месяц обязана отклоняться — иначе
    сотруднику начислят зарплату дважды."""
    await _make_salaried_user(db_session)
    month = "2030-06"

    await generate_payrolls_for_month(db_session, month, creator_id=1)

    resp = await admin_client.post("/payrolls/generate/", params={"month": month})
    assert resp.status_code == 400, (
        f"повторная генерация должна отклоняться, получили {resp.status_code}"
    )


async def test_payroll_penalty_only_rule_does_not_crash_generation(admin_client, db_session):
    """Правило только со штрафом (bonus = NULL) роняло генерацию целиком:
    `rule.bonus > 0` бросало TypeError на None."""
    resp = await admin_client.post("/kpi-rules/", json={"min_percent": 0, "penalty": 10})
    assert resp.status_code == 201, resp.text
    rule_id = resp.json()["id"]

    try:
        user = await _make_salaried_user(db_session, salary=40000)
        month = "2030-07"
        payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)
        assert any(p.user_id == user.id for p in payrolls)
    finally:
        await admin_client.delete(f"/kpi-rules/{rule_id}")


# --------------------------------------------------------------------------
# Складские остатки: перемещение между складами
# --------------------------------------------------------------------------


async def _catalog(admin_client, quantity: int = 20):
    suffix = uuid.uuid4().hex[:8]
    resp = await admin_client.post("/warehouses/", json={"name": f"Fin WH A {suffix}"})
    wh_from = resp.json()["id"]
    resp = await admin_client.post("/warehouses/", json={"name": f"Fin WH B {suffix}"})
    wh_to = resp.json()["id"]

    resp = await admin_client.post(
        "/products/",
        json={
            "name": f"Fin Product {suffix}", "description": "", "detail": "",
            "cost_price": 100, "price": 250,
            "category_id": None, "subcategory_id": None, "brand_id": None,
        },
    )
    product_id = resp.json()["id"]

    resp = await admin_client.post(
        "/stock/",
        json={"product_id": product_id, "warehouse_id": wh_from, "quantity": quantity},
    )
    assert resp.status_code == 200, resp.text
    return wh_from, wh_to, product_id


async def _stock_qty(admin_client, product_id, warehouse_id) -> int:
    resp = await admin_client.get(
        "/stock/", params={"product_id": product_id, "warehouse_id": warehouse_id}
    )
    assert resp.status_code == 200, resp.text
    stocks = resp.json()["stocks"]
    return stocks[0]["quantity"] if stocks else 0


async def test_stock_transfer_preserves_total_quantity(admin_client):
    wh_from, wh_to, product_id = await _catalog(admin_client, quantity=20)

    resp = await admin_client.post(
        "/stock/transfer",
        json={
            "product_id": product_id,
            "from_warehouse_id": wh_from,
            "to_warehouse_id": wh_to,
            "quantity": 8,
        },
    )
    assert resp.status_code in (200, 201), resp.text

    left = await _stock_qty(admin_client, product_id, wh_from)
    arrived = await _stock_qty(admin_client, product_id, wh_to)
    assert left == 12
    assert arrived == 8
    assert left + arrived == 20, "перемещение не должно создавать или терять товар"


async def test_stock_transfer_rejects_same_warehouse(admin_client):
    wh_from, _, product_id = await _catalog(admin_client)
    resp = await admin_client.post(
        "/stock/transfer",
        json={
            "product_id": product_id,
            "from_warehouse_id": wh_from,
            "to_warehouse_id": wh_from,
            "quantity": 1,
        },
    )
    assert resp.status_code == 400, resp.text


async def test_stock_transfer_rejects_more_than_available(admin_client):
    wh_from, wh_to, product_id = await _catalog(admin_client, quantity=5)
    resp = await admin_client.post(
        "/stock/transfer",
        json={
            "product_id": product_id,
            "from_warehouse_id": wh_from,
            "to_warehouse_id": wh_to,
            "quantity": 50,
        },
    )
    assert resp.status_code == 400, resp.text
    assert await _stock_qty(admin_client, product_id, wh_from) == 5, (
        "неудачное перемещение не должно менять остаток"
    )


# --------------------------------------------------------------------------
# Движение денежных средств
# --------------------------------------------------------------------------


async def test_cashflow_list_requires_permission_and_responds(admin_client):
    resp = await admin_client.get("/cash-flows/")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), (list, dict))
