import os


async def test_login_wrong_password(client):
    resp = await client.post(
        "/auth/login",
        data={"username": "admin@example.com", "password": "definitely_wrong"},
    )
    assert resp.status_code == 400


async def test_login_unapproved_user(client):
    # Register a new user (not yet approved)
    resp = await client.post(
        "/auth/register",
        json={
            "full_name": "Test User",
            "email": "unapproved@example.com",
            "password": "testpass123",
        },
    )
    assert resp.status_code == 201

    resp = await client.post(
        "/auth/login",
        data={"username": "unapproved@example.com", "password": "testpass123"},
    )
    assert resp.status_code == 403


async def test_login_success_sets_cookie(client):
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD", "testpassword123")
    resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.cookies


async def test_logout(auth_client):
    resp = await auth_client.post("/auth/logout")
    assert resp.status_code == 200
