async def test_products_requires_auth(client):
    resp = await client.get("/products/")
    assert resp.status_code == 401


async def test_products_returns_list(auth_client):
    resp = await auth_client.get("/products/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
