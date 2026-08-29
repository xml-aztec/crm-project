import os

# Должно быть установлено до `from app.main import app` — core/limiter.py
# читает этот флаг при импорте, чтобы не спотыкаться о лимит /auth/login
# (5/мин) при большом количестве логинов в одном прогоне тестов.
os.environ.setdefault("DISABLE_RATE_LIMIT", "true")

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import SessionLocal


@pytest_asyncio.fixture
async def db_session():
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def auth_client(client):
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD", "testpassword123")
    resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed in fixture: {resp.text}"
    return client


@pytest_asyncio.fixture(scope="session")
async def admin_client():
    """Session-scoped admin client: logs in once for the whole test run instead
    of once per test, so test modules with many admin-only cases don't trip the
    /auth/login rate limit (5 per minute). Use this instead of `auth_client` in
    new tests unless the test itself needs to mutate the session (e.g. logout)."""
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD", "testpassword123")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.post(
            "/auth/login",
            data={"username": email, "password": password},
        )
        assert resp.status_code == 200, f"Login failed in fixture: {resp.text}"
        yield c
