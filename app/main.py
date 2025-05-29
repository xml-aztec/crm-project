from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.database import init_db

from app.api import auth
from app.api import users
from app.api import categories
from app.api import subcategories
from app.api import brands
from app.api import products

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
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