from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.database import init_db, SessionLocal
from app.utils.init_roles import init_roles

from app.api import auth
from app.api import users
from app.api import categories
from app.api import subcategories
from app.api import brands
from app.api import products
from app.api import customer_types, order_statuses
from app.api import orders
from app.api import roles
from app.api import positions
from app.api import analytics


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

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(subcategories.router)
app.include_router(brands.router)
app.include_router(products.router)
app.include_router(customer_types.router)
app.include_router(order_statuses.router)
app.include_router(orders.router)
app.include_router(roles.router)
app.include_router(positions.router)
app.include_router(analytics.router)