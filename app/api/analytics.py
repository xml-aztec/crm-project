from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from datetime import datetime
from typing import Optional

from app.core.dependencies import get_db
from app.models.order import Order
from app.models.customer import Customer
from app.models.order_item import OrderItem
from app.repositories import analytics as repo

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/daily")
async def get_daily_analytics(
    db: AsyncSession = Depends(get_db),
):
    return await repo.get_daily_stats(db)

@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    return await repo.get_order_summary(db)
