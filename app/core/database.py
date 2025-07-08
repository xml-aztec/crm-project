from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite+aiosqlite:///./crm.db"

engine = create_async_engine(DATABASE_URL, echo=True, future=True)

SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def init_db():
    from app.models import (
        category, subcategory, brand, product,
        customer_type, customer, order_status, order, order_item,
        user, role, position, monthly_target, payment_method, warehouse, 
        product_stock, branch, supply, supply_item, supplier, payroll, 
        cashflow, cashflow_category, cashflow_type, kpi_rule, budget
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)