from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import order as repo
from app.schemas.order import OrderCreate, OrderRead

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=OrderRead)
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create_order(db, data.model_dump(exclude={"items"}), data.items)

@router.get("/", response_model=list[OrderRead])
async def list_orders(
    skip: int = 0,
    limit: int = 10,
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    manager_id: Optional[int] = Query(None),
    status_id: Optional[int] = Query(None),
    customer_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await repo.get_orders(
        db,
        skip=skip,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
        manager_id=manager_id,
        status_id=status_id,
        customer_name=customer_name,
    )