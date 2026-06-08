from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def init_db():
    from app.models import (
        category, subcategory, brand, product,
        customer_type, customer, order_status, order, order_item,
        user, role, position, monthly_target, payment_method, warehouse,
        product_stock, branch, supply, supply_item, supplier, payroll,
        cashflow, cashflow_category, cashflow_type, kpi_rule, budget,
        cash_gap_forecast, stock_log, notification, order_history
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)