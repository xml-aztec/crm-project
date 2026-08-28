import uuid

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _uniq(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


async def _create_category(admin_client) -> int:
    resp = await admin_client.post("/categories/", json={"name": _uniq("Cat")})
    assert resp.status_code == 201
    return resp.json()["id"]


async def test_subcategories_paginated_filters_by_category(admin_client):
    category_id = await _create_category(admin_client)
    other_category_id = await _create_category(admin_client)

    name = _uniq("Sub")
    resp = await admin_client.post(
        "/subcategories/", json={"name": name, "category_id": category_id}
    )
    assert resp.status_code == 201

    resp = await admin_client.get(
        "/subcategories/paginated", params={"category_id": category_id, "search": name}
    )
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["category_id"] == category_id

    resp = await admin_client.get(
        "/subcategories/paginated", params={"category_id": other_category_id, "search": name}
    )
    assert resp.json()["total"] == 0


async def test_subcategories_bulk_status(admin_client):
    category_id = await _create_category(admin_client)
    name = _uniq("BulkSub")
    resp = await admin_client.post(
        "/subcategories/", json={"name": name, "category_id": category_id}
    )
    subcategory_id = resp.json()["id"]

    resp = await admin_client.post(
        "/subcategories/bulk-status", json={"ids": [subcategory_id], "is_active": False}
    )
    assert resp.status_code == 200
    assert resp.json()["updated"] == 1


async def test_deleting_subcategory_unassigns_products_instead_of_deleting_them(admin_client):
    """Regression test: Subcategory.products used to cascade="all, delete-orphan",
    which meant deleting a subcategory silently deleted its products instead of
    just unassigning them (the FK is ondelete="SET NULL")."""
    category_id = await _create_category(admin_client)
    sub_name = _uniq("Sub")
    resp = await admin_client.post(
        "/subcategories/", json={"name": sub_name, "category_id": category_id}
    )
    subcategory_id = resp.json()["id"]

    sku = _uniq("SKU")
    resp = await admin_client.post(
        "/products/",
        json={
            "name": _uniq("Product"),
            "description": None,
            "detail": None,
            "cost_price": 10,
            "price": 20,
            "category_id": category_id,
            "subcategory_id": subcategory_id,
            "brand_id": None,
            "sku": sku,
        },
    )
    assert resp.status_code == 201
    product_id = resp.json()["id"]

    resp = await admin_client.post(
        "/subcategories/bulk-delete", json={"ids": [subcategory_id]}
    )
    assert resp.status_code == 200
    assert resp.json()["deleted"] == []
    assert resp.json()["skipped"][0]["id"] == subcategory_id

    resp = await admin_client.delete(f"/subcategories/{subcategory_id}")
    assert resp.status_code == 200

    resp = await admin_client.get(f"/products/{product_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == product_id
    assert body["subcategory_id"] is None
