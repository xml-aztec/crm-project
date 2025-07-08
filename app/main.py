from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db, SessionLocal
from app.utils.init_roles import init_roles

from app.api import auth
from app.api import users
from app.api import categories
from app.api import subcategories
from app.api import brands
from app.api import branches
from app.api import warehouses
from app.api import products
from app.api import product_stocks
from app.api import customer_types, order_statuses
from app.api import orders
from app.api import suppliers
from app.api import supplies
from app.api import roles
from app.api import positions
from app.api import cashflow_meta
from app.api import analytics
from app.api import stock_logs
from app.api import cashflows
from app.api import budgets
from app.api import cash_gaps
from app.api import monthly_targets
from app.api import payrolls
from app.api import order_items
from app.api import customers  
from app.api import payment_methods


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    async with SessionLocal() as session:
        await init_roles(session)

    yield

app = FastAPI(
    title="CRM System",
    description="Backend API for managing a tech store CRM",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(subcategories.router)
app.include_router(brands.router)
app.include_router(branches.router)
app.include_router(warehouses.router)
app.include_router(products.router)
app.include_router(product_stocks.router)
app.include_router(customer_types.router)
app.include_router(order_statuses.router)
app.include_router(orders.router)
app.include_router(order_items.router)
app.include_router(suppliers.router)
app.include_router(supplies.router)
app.include_router(payment_methods.router)
app.include_router(roles.router)
app.include_router(positions.router)
app.include_router(cashflow_meta.router)
app.include_router(budgets.router)
app.include_router(cash_gaps.router)
app.include_router(analytics.router)
app.include_router(stock_logs.router)
app.include_router(cashflows.router)
app.include_router(monthly_targets.router)
app.include_router(payrolls.router)
app.include_router(customers.router)
