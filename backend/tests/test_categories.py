import uuid

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _uniq(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


async def test_categories_paginated_requires_auth(client):
    resp = await client.get("/categories/paginated")
    assert resp.status_code == 401


async def test_categories_paginated_search_and_shape(admin_client):
    name = _uniq("TestCat")
    resp = await admin_client.post("/categories/", json={"name": name})
    assert resp.status_code == 201
    category_id = resp.json()["id"]

    resp = await admin_client.get("/categories/paginated", params={"search": name})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["id"] == category_id
    assert item["is_active"] is True
    assert item["products_count"] == 0
    assert item["subcategories_count"] == 0
    assert "created_at" in item


async def test_categories_paginated_sort_by_name(admin_client):
    token = uuid.uuid4().hex[:8]
    name_a = f"{token}-A"
    name_b = f"{token}-B"
    for name in (name_b, name_a):
        resp = await admin_client.post("/categories/", json={"name": name})
        assert resp.status_code == 201

    resp = await admin_client.get(
        "/categories/paginated",
        params={"search": token, "sort_by": "name", "sort_order": "asc"},
    )
    names = [item["name"] for item in resp.json()["items"]]
    assert names == [name_a, name_b]

    resp = await admin_client.get(
        "/categories/paginated",
        params={"search": token, "sort_by": "name", "sort_order": "desc"},
    )
    names = [item["name"] for item in resp.json()["items"]]
    assert names == [name_b, name_a]


async def test_category_quick_status_toggle(admin_client):
    name = _uniq("ToggleCat")
    resp = await admin_client.post("/categories/", json={"name": name})
    category_id = resp.json()["id"]

    resp = await admin_client.patch(f"/categories/{category_id}", json={"is_active": False})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False
    assert resp.json()["name"] == name  # name unchanged by a status-only patch


async def test_categories_bulk_status(admin_client):
    name = _uniq("BulkStatusCat")
    resp = await admin_client.post("/categories/", json={"name": name})
    category_id = resp.json()["id"]

    resp = await admin_client.post(
        "/categories/bulk-status", json={"ids": [category_id], "is_active": False}
    )
    assert resp.status_code == 200
    assert resp.json()["updated"] == 1

    resp = await admin_client.get("/categories/paginated", params={"search": name})
    assert resp.json()["items"][0]["is_active"] is False


async def test_categories_bulk_delete_skips_when_subcategories_linked(admin_client):
    cat_name = _uniq("ParentCat")
    resp = await admin_client.post("/categories/", json={"name": cat_name})
    category_id = resp.json()["id"]

    sub_name = _uniq("ChildSub")
    resp = await admin_client.post(
        "/subcategories/", json={"name": sub_name, "category_id": category_id}
    )
    assert resp.status_code == 201

    resp = await admin_client.post("/categories/bulk-delete", json={"ids": [category_id]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["deleted"] == []
    assert len(data["skipped"]) == 1
    assert data["skipped"][0]["id"] == category_id

    resp = await admin_client.post(
        "/categories/bulk-delete", json={"ids": [category_id], "force": True}
    )
    assert resp.status_code == 200
    assert category_id in resp.json()["deleted"]
