import uuid
from io import BytesIO
from unittest.mock import patch

import pytest
from PIL import Image

from app.core.config import settings

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _make_test_image_bytes(fmt: str = "PNG") -> bytes:
    img = Image.new("RGB", (50, 60), color=(255, 0, 0))
    buf = BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


@pytest.fixture
def mock_storage(monkeypatch):
    monkeypatch.setattr(settings, "R2_PUBLIC_URL", "https://pub-test.r2.dev", raising=False)

    state = {"uploaded": {}, "deleted": []}

    async def fake_download_object(key):
        if key not in state["uploaded"]:
            raise RuntimeError("not found")
        return state["uploaded"][key][0]

    async def fake_upload_object(key, data, content_type):
        state["uploaded"][key] = (data, content_type)

    async def fake_delete_object(key):
        state["deleted"].append(key)
        state["uploaded"].pop(key, None)

    async def fake_delete_objects(keys):
        for k in keys:
            state["deleted"].append(k)
            state["uploaded"].pop(k, None)

    def fake_presigned_url(key, content_type, expires_in=300):
        return f"https://upload.test/{key}"

    with patch("app.utils.storage.generate_presigned_put_url", side_effect=fake_presigned_url), \
         patch("app.utils.storage.download_object", side_effect=fake_download_object), \
         patch("app.utils.storage.upload_object", side_effect=fake_upload_object), \
         patch("app.utils.storage.delete_object", side_effect=fake_delete_object), \
         patch("app.utils.storage.delete_objects", side_effect=fake_delete_objects):
        yield state


async def _create_product(admin_client) -> int:
    suffix = uuid.uuid4().hex[:8]
    resp = await admin_client.post(
        "/products/",
        json={
            "name": f"Image Test Product {suffix}",
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
    return resp.json()["id"]


async def _presign(admin_client, product_id, *, content_type="image/png", file_size=1024):
    resp = await admin_client.post(
        f"/products/{product_id}/images/presign",
        json={"filename": "photo.png", "content_type": content_type, "file_size": file_size},
    )
    return resp


async def _upload_and_confirm(admin_client, mock_storage, product_id, *, data: bytes = None, content_type="image/png"):
    presign_resp = await _presign(admin_client, product_id, content_type=content_type, file_size=len(data or b"x"))
    assert presign_resp.status_code == 200, presign_resp.text
    key = presign_resp.json()["key"]

    mock_storage["uploaded"][key] = (data if data is not None else _make_test_image_bytes(), content_type)

    confirm_resp = await admin_client.post(f"/products/{product_id}/images/confirm", json={"key": key})
    return confirm_resp, key


async def test_presign_rejects_bad_content_type_and_oversized_file(admin_client, mock_storage):
    product_id = await _create_product(admin_client)

    resp = await _presign(admin_client, product_id, content_type="image/gif", file_size=1024)
    assert resp.status_code == 400, resp.text

    resp = await _presign(admin_client, product_id, content_type="image/png", file_size=6 * 1024 * 1024)
    assert resp.status_code == 400, resp.text


async def test_confirm_creates_variants_and_marks_first_image_primary(admin_client, mock_storage):
    product_id = await _create_product(admin_client)

    confirm_resp, staging_key = await _upload_and_confirm(admin_client, mock_storage, product_id)
    assert confirm_resp.status_code == 201, confirm_resp.text
    body = confirm_resp.json()

    assert body["is_primary"] is True
    assert body["position"] == 0
    assert body["thumbnail_url"].endswith("-thumb.webp")
    assert body["full_url"].endswith("-full.webp")
    assert f"products/{product_id}/" in body["thumbnail_url"]

    # Staging-объект удалён после генерации вариантов, сами варианты — загружены.
    assert staging_key in mock_storage["deleted"]
    assert any(k.endswith("-thumb.webp") for k in mock_storage["uploaded"])
    assert any(k.endswith("-full.webp") for k in mock_storage["uploaded"])


async def test_confirm_rejects_non_image_and_cleans_up_staging_object(admin_client, mock_storage):
    product_id = await _create_product(admin_client)

    confirm_resp, staging_key = await _upload_and_confirm(
        admin_client, mock_storage, product_id, data=b"not a real image, just text pretending to be one"
    )
    assert confirm_resp.status_code == 400, confirm_resp.text
    assert staging_key in mock_storage["deleted"]

    resp = await admin_client.get(f"/products/{product_id}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["images"] == []


async def test_second_image_is_not_primary_and_position_increments(admin_client, mock_storage):
    product_id = await _create_product(admin_client)

    first_resp, _ = await _upload_and_confirm(admin_client, mock_storage, product_id)
    second_resp, _ = await _upload_and_confirm(admin_client, mock_storage, product_id)
    assert first_resp.status_code == 201, first_resp.text
    assert second_resp.status_code == 201, second_resp.text

    first, second = first_resp.json(), second_resp.json()
    assert first["is_primary"] is True
    assert second["is_primary"] is False
    assert second["position"] == first["position"] + 1


async def test_reorder_and_set_primary(admin_client, mock_storage):
    product_id = await _create_product(admin_client)

    first_resp, _ = await _upload_and_confirm(admin_client, mock_storage, product_id)
    second_resp, _ = await _upload_and_confirm(admin_client, mock_storage, product_id)
    first_id, second_id = first_resp.json()["id"], second_resp.json()["id"]

    resp = await admin_client.patch(
        f"/products/{product_id}/images/reorder", json={"image_ids": [second_id, first_id]}
    )
    assert resp.status_code == 200, resp.text
    images = resp.json()
    assert [img["id"] for img in images] == [second_id, first_id]
    assert [img["position"] for img in images] == [0, 1]

    resp = await admin_client.patch(f"/products/{product_id}/images/{second_id}/primary")
    assert resp.status_code == 200, resp.text
    images_by_id = {img["id"]: img for img in resp.json()}
    assert images_by_id[second_id]["is_primary"] is True
    assert images_by_id[first_id]["is_primary"] is False
    assert sum(1 for img in images_by_id.values() if img["is_primary"]) == 1


async def test_delete_image_removes_r2_objects_and_promotes_next_primary(admin_client, mock_storage):
    product_id = await _create_product(admin_client)

    first_resp, _ = await _upload_and_confirm(admin_client, mock_storage, product_id)
    second_resp, _ = await _upload_and_confirm(admin_client, mock_storage, product_id)
    first = first_resp.json()
    second = second_resp.json()
    assert first["is_primary"] is True

    thumb_key = first["thumbnail_url"].replace(settings.R2_PUBLIC_URL + "/", "")
    full_key = first["full_url"].replace(settings.R2_PUBLIC_URL + "/", "")

    resp = await admin_client.delete(f"/products/{product_id}/images/{first['id']}")
    assert resp.status_code == 204, resp.text

    assert thumb_key in mock_storage["deleted"]
    assert full_key in mock_storage["deleted"]

    resp = await admin_client.get(f"/products/{product_id}")
    remaining = resp.json()["images"]
    assert len(remaining) == 1
    assert remaining[0]["id"] == second["id"]
    assert remaining[0]["is_primary"] is True


async def test_product_deletion_cascades_images_and_r2_cleanup(admin_client, mock_storage):
    product_id = await _create_product(admin_client)
    confirm_resp, _ = await _upload_and_confirm(admin_client, mock_storage, product_id)
    image = confirm_resp.json()
    thumb_key = image["thumbnail_url"].replace(settings.R2_PUBLIC_URL + "/", "")
    full_key = image["full_url"].replace(settings.R2_PUBLIC_URL + "/", "")

    resp = await admin_client.delete(f"/products/{product_id}")
    assert resp.status_code == 200, resp.text

    assert thumb_key in mock_storage["deleted"]
    assert full_key in mock_storage["deleted"]

    resp = await admin_client.get(f"/products/{product_id}")
    assert resp.status_code == 404, resp.text


async def test_staff_without_update_permission_is_forbidden(db_session, admin_client, mock_storage):
    from sqlalchemy import select
    from app.core.security import get_password_hash
    from app.main import app
    from app.models.role import Role
    from app.models.user import User
    from app.rbac.service import sync_rbac_role_for_user
    from app.utils.init_roles import init_roles
    from httpx import ASGITransport, AsyncClient

    product_id = await _create_product(admin_client)

    await init_roles(db_session)
    role = (await db_session.execute(select(Role).where(Role.name == "staff"))).scalar_one()
    password = "TestPass123!"
    staff = User(
        email=f"image-test-staff-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        full_name="Image Test Staff",
        is_active=True,
        is_approved=True,
        role_id=role.id,
    )
    db_session.add(staff)
    await db_session.flush()
    await sync_rbac_role_for_user(staff.id, db_session)
    await db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as staff_client:
        login_resp = await staff_client.post("/auth/login", data={"username": staff.email, "password": password})
        assert login_resp.status_code == 200, login_resp.text

        resp = await _presign(staff_client, product_id)
        assert resp.status_code == 403, resp.text
