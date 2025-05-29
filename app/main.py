from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.database import init_db

from app.api import auth
from app.api import users
from app.api import categories
from app.api import subcategories

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

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(subcategories.router, prefix="/subcategories", tags=["Subcategories"])
