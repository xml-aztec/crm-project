import uuid

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _uniq(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


async def test_brands_paginated_search(admin_client):
    name = _uniq("TestBrand")
    resp = await admin_client.post("/brands/", json={"name": name})
    assert resp.status_code == 201
    brand_id = resp.json()["id"]

    resp = await admin_client.get("/brands/paginated", params={"search": name})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == brand_id
    assert data["items"][0]["products_count"] == 0


async def test_brands_bulk_status(admin_client):
    name = _uniq("BulkBrand")
    resp = await admin_client.post("/brands/", json={"name": name})
    brand_id = resp.json()["id"]

    resp = await admin_client.post(
        "/brands/bulk-status", json={"ids": [brand_id], "is_active": False}
    )
    assert resp.status_code == 200
    assert resp.json()["updated"] == 1


async def test_deleting_brand_unassigns_products_instead_of_deleting_them(admin_client):
    """Regression test: Brand.products used to cascade="all, delete-orphan" — see
    the equivalent subcategory test for details."""
    brand_name = _uniq("Brand")
    resp = await admin_client.post("/brands/", json={"name": brand_name})
    brand_id = resp.json()["id"]

    sku = _uniq("SKU")
    resp = await admin_client.post(
        "/products/",
        json={
            "name": _uniq("Product"),
            "description": None,
            "detail": None,
            "cost_price": 10,
            "price": 20,
            "category_id": None,
            "subcategory_id": None,
            "brand_id": brand_id,
            "sku": sku,
        },
    )
    assert resp.status_code == 201
    product_id = resp.json()["id"]

    resp = await admin_client.post("/brands/bulk-delete", json={"ids": [brand_id]})
    assert resp.status_code == 200
    assert resp.json()["deleted"] == []

    resp = await admin_client.delete(f"/brands/{brand_id}")
    assert resp.status_code == 200

    resp = await admin_client.get(f"/products/{product_id}")
    assert resp.status_code == 200
    assert resp.json()["brand_id"] is None
