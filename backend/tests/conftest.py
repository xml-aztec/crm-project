"""Тестовая обвязка.

Два обязательных условия, без которых набор не работал (аудит C4):

1. `ASGITransport` пробрасывает только scope типа `http` и НЕ выполняет
   протокол lifespan — поэтому `main.py::lifespan` (а с ним `init_db()` и всё
   наполнение справочников) никогда не запускался, и тесты падали на
   `relation "users" does not exist`. Лечится обёрткой `LifespanManager`.

2. Тесты работают с отдельной базой `<имя>_test`, а не с той, на которую
   указывает `DATABASE_URL`, и она ПЕРЕСОЗДАЁТСЯ перед каждым прогоном.
   Раньше прогон шёл прямо по рабочей базе и оставлял в ней мусор, из-за чего
   второй запуск подряд падал. Имя выводится здесь же и подставляется в
   окружение ДО импорта приложения — движок в `app.core.database` создаётся на
   этапе импорта и читает URL один раз.
"""
import asyncio
import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

# Должно быть установлено до `from app.main import app` — core/limiter.py
# читает этот флаг при импорте, чтобы не спотыкаться о лимит /auth/login
# (5/мин) при большом количестве логинов в одном прогоне тестов.
os.environ.setdefault("DISABLE_RATE_LIMIT", "true")

# Учётка администратора, которую засеет lifespan и под которой логинятся
# фикстуры ниже. Задаём явно, иначе сид возьмёт значения из .env разработчика,
# а фикстуры — свои дефолты, и логин в них развалится.
os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "testpassword123")
os.environ.setdefault("ADMIN_FULL_NAME", "Test Admin")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
# Планировщик напоминаний стартует внутри lifespan. В тестах он не нужен —
# отодвигаем интервал, чтобы джоба не просыпалась посреди прогона.
os.environ.setdefault("TASK_REMINDER_INTERVAL_MINUTES", "10080")


def _derive_test_db_url(url: str) -> str:
    """`.../crm_db` -> `.../crm_db_test`. Идемпотентно."""
    parts = urlsplit(url)
    name = parts.path.lstrip("/")
    if not name:
        raise RuntimeError("DATABASE_URL не содержит имени базы данных")
    if not name.endswith("_test"):
        name = f"{name}_test"
    return urlunsplit((parts.scheme, parts.netloc, f"/{name}", parts.query, parts.fragment))


def _recreate_test_database(url: str) -> None:
    """Пересоздаёт тестовую базу с нуля перед каждым прогоном.

    Не «создать, если нет», а именно DROP + CREATE — иначе набор не
    воспроизводим: тесты пишут в БД и ничего за собой не убирают, поэтому
    второй прогон подряд валился (например, test_login_unapproved_user
    регистрирует фиксированный email и на второй раз получал 400 «Email
    already registered» вместо 201). Пустая база на старте убирает весь этот
    класс расхождений разом и повторяет поведение CI, где Postgres каждый раз
    поднимается заново.

    Действует только на базу с суффиксом `_test` — это проверено assert'ом
    ниже до вызова.
    """
    import asyncpg

    parts = urlsplit(url)
    target = parts.path.lstrip("/")
    # asyncpg не понимает SQLAlchemy-схему `postgresql+asyncpg`.
    maintenance = urlunsplit(("postgresql", parts.netloc, "/postgres", "", ""))

    async def _run() -> None:
        conn = await asyncpg.connect(maintenance)
        try:
            # Имя не параметризуется в DDL, но оно выведено из нашего же
            # DATABASE_URL, а не из пользовательского ввода. FORCE отцепляет
            # висящие соединения (Postgres 13+).
            await conn.execute(f'DROP DATABASE IF EXISTS "{target}" WITH (FORCE)')
            await conn.execute(f'CREATE DATABASE "{target}"')
        finally:
            await conn.close()

    asyncio.run(_run())


def _read_database_url() -> str:
    """Переменная окружения (так задаёт CI), иначе — backend/.env (так у
    разработчика локально; pydantic-settings читает его сам, но нам URL нужен
    ДО импорта настроек, чтобы успеть подменить имя базы)."""
    from_env = os.environ.get("DATABASE_URL")
    if from_env:
        return from_env

    from dotenv import dotenv_values

    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.is_file():
        value = dotenv_values(env_file).get("DATABASE_URL")
        if value:
            return value

    raise RuntimeError(
        "DATABASE_URL не задан ни в окружении, ни в backend/.env. Тесты "
        "используют отдельную базу <имя>_test, выведенную из него."
    )


_raw_db_url = _read_database_url()

_test_db_url = _derive_test_db_url(_raw_db_url)
# Страховка: не дать прогону уйти в рабочую базу, даже если логику выше
# однажды сломают.
assert _test_db_url.rstrip("/").endswith("_test"), (
    f"Отказ запускаться: {_test_db_url} не похож на тестовую базу"
)
_recreate_test_database(_test_db_url)
os.environ["DATABASE_URL"] = _test_db_url


def _apply_migrations() -> None:
    """Поднимает схему тестовой базы через Alembic.

    Раньше схему создавал init_db() (Base.metadata.create_all) внутри
    lifespan приложения. Теперь единственный источник истины — миграции
    (аудит M6), поэтому и тесты идут через них. Побочный, но важный эффект:
    каждый прогон тестов проверяет, что цепочка миграций накатывается на
    пустую базу, — раньше это не покрывалось ничем.
    """
    from alembic import command
    from alembic.config import Config

    root = Path(__file__).resolve().parent.parent
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    command.upgrade(cfg, "head")


_apply_migrations()

import pytest_asyncio  # noqa: E402
from asgi_lifespan import LifespanManager  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _lifespan():
    """Прогоняет startup-логику приложения один раз на весь сеанс.

    Именно здесь создаётся схема (`init_db`) и засеваются роли, админ,
    статусы заказов, типы движения денег, должности и RBAC — то, без чего
    падал каждый тест, обращающийся к БД.
    """
    async with LifespanManager(app):
        yield


@pytest_asyncio.fixture
async def db_session():
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest_asyncio.fixture
async def auth_client(client):
    resp = await client.post(
        "/auth/login",
        data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, f"Login failed in fixture: {resp.text}"
    return client


@pytest_asyncio.fixture(scope="session")
async def admin_client():
    """Session-scoped admin client: logs in once for the whole test run instead
    of once per test, so test modules with many admin-only cases don't trip the
    /auth/login rate limit (5 per minute). Use this instead of `auth_client` in
    new tests unless the test itself needs to mutate the session (e.g. logout)."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        resp = await c.post(
            "/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        assert resp.status_code == 200, f"Login failed in fixture: {resp.text}"
        yield c
