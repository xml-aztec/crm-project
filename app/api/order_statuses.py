from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import order_status as repo
from app.schemas.order_status import OrderStatusCreate, OrderStatusRead

router = APIRouter(prefix="/order-statuses", tags=["Order Statuses"])

@router.get("/", response_model=list[OrderStatusRead])
async def list_all(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post("/", response_model=OrderStatusRead)
async def create(data: OrderStatusCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data.dict())