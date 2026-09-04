from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

_connect_args: dict = {}
if settings.DB_DISABLE_STATEMENT_CACHE:
    # См. комментарий у DB_DISABLE_STATEMENT_CACHE в core/config.py: нужно
    # только за пулером в transaction-режиме.
    _connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def init_db():
    """Создаёт схему из моделей напрямую, В ОБХОД Alembic.

    НЕ вызывается при старте приложения (см. main.py::lifespan): источник
    истины для схемы — миграции. Оставлено как служебный инструмент для
    разовых задач вроде поднятия одноразовой базы в скрипте, и на него всё
    ещё опирается ветка восстановления в docker-entrypoint.sh для баз,
    заведённых до появления Alembic в проекте.
    """
    from app.models import (
        category, subcategory, brand, product,
        customer_type, customer, order_status, order, order_item,
        user, role, position, monthly_target, payment_method, warehouse,
        product_stock, branch, supply, supply_item, supplier, payroll,
        cashflow, cashflow_category, cashflow_type, kpi_rule, budget,
        cash_gap_forecast, stock_log, notification, order_history,
        password_reset_token, task, notification_type, notification_preference
    )
    from app.rbac import models as rbac_models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)