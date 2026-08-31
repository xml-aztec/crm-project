import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.rbac.service import sync_rbac_role_for_user
from app.schemas.supplier import SupplierOut
from app.schemas.supply import SupplyOut
from app.schemas.warehouse import WarehouseOut
from app.utils.init_roles import init_roles
from app.utils.pdf import render_supply_pdf

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _make_supply_out(supply_id: int = 1) -> SupplyOut:
    now = datetime.now(timezone.utc)
    return SupplyOut(
        id=supply_id,
        supplier=SupplierOut(id=1, name="Test Supplier", contact_person=None, contact_info=None, address=None),
        warehouse=WarehouseOut(id=1, name="Test Warehouse", location=None, branch_id=None),
        delivered_at=now,
        created_at=now,
        created_user=None,
        items=[],
    )


async def _make_staff(db_session) -> tuple[User, str]:
    await init_roles(db_session)
    role = (await db_session.execute(select(Role).where(Role.name == "staff"))).scalar_one()
    password = "TestPass123!"
    user = User(
        email=f"appsettings-test-staff-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        full_name="App Settings Test Staff",
        is_active=True,
        is_approved=True,
        role_id=role.id,
    )
    db_session.add(user)
    await db_session.flush()
    await sync_rbac_role_for_user(user.id, db_session)
    await db_session.commit()
    return user, password


async def test_get_general_settings_creates_default_row_idempotently(admin_client):
    resp = await admin_client.get("/settings/general/")
    assert resp.status_code == 200, resp.text
    first = resp.json()

    resp = await admin_client.get("/settings/general/")
    assert resp.status_code == 200, resp.text
    second = resp.json()

    # Тот же (единственный) объект, а не второй созданный при повторном чтении.
    assert first["updated_at"] == second["updated_at"]


async def test_patch_general_settings_updates_only_given_fields(admin_client):
    resp = await admin_client.patch("/settings/general/", json={"company_name": "Acme LLC"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["company_name"] == "Acme LLC"

    resp = await admin_client.patch("/settings/general/", json={"company_phone": "+996 000 000"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["company_name"] == "Acme LLC"
    assert body["company_phone"] == "+996 000 000"

    # Откатываем, чтобы не оставлять мусор в общих настройках между тестами.
    resp = await admin_client.patch(
        "/settings/general/", json={"company_name": None, "company_phone": None}
    )
    assert resp.status_code == 200, resp.text


async def test_general_settings_forbidden_for_staff(db_session, admin_client):
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    staff, password = await _make_staff(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as staff_client:
        login_resp = await staff_client.post("/auth/login", data={"username": staff.email, "password": password})
        assert login_resp.status_code == 200, login_resp.text

        resp = await staff_client.get("/settings/general/")
        assert resp.status_code == 403, resp.text

        resp = await staff_client.patch("/settings/general/", json={"company_name": "x"})
        assert resp.status_code == 403, resp.text


def _render_invoice_html(**company_kwargs) -> str:
    from app.utils.pdf import env as pdf_env

    supply_data = _make_supply_out().model_dump()
    supply_data["items"] = []

    context = {
        "supply": supply_data, "items": [], "total_cost": 0, "qr_code": "", "qr_url": "",
        "supplier_name": "Test Supplier", "supplier_contact_person": "", "supplier_contact_info": "", "supplier_address": "",
        "created_user_full_name": "",
        "company_name": None, "company_logo_url": None, "company_address": None, "company_phone": None,
    }
    context.update(company_kwargs)
    return pdf_env.get_template("supply_invoice.html").render(**context)


async def test_supply_pdf_includes_company_info_when_set(db_session):
    from app.repositories import app_settings as app_settings_repo

    await app_settings_repo.update_settings(
        db_session, {"company_name": "Rendered Co", "company_address": "Test Address 1", "company_logo_url": None}
    )

    # render_supply_pdf сам читает настройки через app_settings_repo.get_settings —
    # проверяем итоговый PDF (валидные байты) и отдельно сам HTML-шаблон
    # (тот же env/файл, что использует render_supply_pdf) — так можно
    # проверить содержимое текста без парсинга бинарного PDF.
    pdf_bytes = await render_supply_pdf(db_session, _make_supply_out())
    assert pdf_bytes.startswith(b"%PDF")

    html = _render_invoice_html(company_name="Rendered Co", company_address="Test Address 1")
    assert "Rendered Co" in html
    assert "Test Address 1" in html
    # Блок реквизитов рендерится (company_name задан), но без img-тега логотипа.
    company_block = html.split("Реквизиты компании")[1].split("Накладная")[0]
    assert "<img" not in company_block

    await app_settings_repo.update_settings(db_session, {"company_name": None, "company_address": None})


async def test_supply_pdf_renders_without_logo_when_not_set(db_session):
    from app.repositories import app_settings as app_settings_repo

    await app_settings_repo.update_settings(
        db_session, {"company_logo_url": None, "company_name": None, "company_address": None, "company_phone": None}
    )

    pdf_bytes = await render_supply_pdf(db_session, _make_supply_out())
    assert pdf_bytes.startswith(b"%PDF")

    # Ни одно из company-полей не задано — весь блок реквизитов должен отсутствовать.
    html = _render_invoice_html()
    assert "Реквизиты компании" not in html
