from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.database import init_db

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

@app.get("/")
async def root():
    return {"message": "CRM backend is running 🚀"}