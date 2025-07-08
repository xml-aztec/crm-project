from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.stock_log import StockLog
from app.schemas.stock_log import StockLogCreate, StockLogType


async def get_stock_logs(
    db: AsyncSession,
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    type: Optional[StockLogType] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> List[StockLog]:
    stmt = (
        select(StockLog)
        .options(
            selectinload(StockLog.product),
            selectinload(StockLog.warehouse)
        )
        .order_by(StockLog.created_at.desc())
    )

    if product_id:
        stmt = stmt.where(StockLog.product_id == product_id)
    if warehouse_id:
        stmt = stmt.where(StockLog.warehouse_id == warehouse_id)
    if type:
        stmt = stmt.where(StockLog.type == type)
    if date_from:
        stmt = stmt.where(StockLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(StockLog.created_at <= date_to)

    result = await db.execute(stmt)
    return result.scalars().all()


async def create_stock_log(db: AsyncSession, data: StockLogCreate) -> StockLog:
    log = StockLog(**data.model_dump())
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log