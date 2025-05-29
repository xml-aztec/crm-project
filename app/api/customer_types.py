from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import customer_type as repo
from app.schemas.customer_type import CustomerTypeCreate, CustomerTypeRead

router = APIRouter(prefix="/customer-types", tags=["Customer Types"])

@router.get("/", response_model=list[CustomerTypeRead])
async def list_all(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post("/", response_model=CustomerTypeRead)
async def create(data: CustomerTypeCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data.dict())