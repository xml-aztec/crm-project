from datetime import datetime
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.stock_log import StockLog
from app.schemas.stock_log import StockLogCreate, StockLogType


def _build_stock_log_filters(
    *,
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    order_id: Optional[int] = None,
    type: Optional[StockLogType] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> list:
    filters = []
    if product_id:
        filters.append(StockLog.product_id == product_id)
    if warehouse_id:
        filters.append(StockLog.warehouse_id == warehouse_id)
    if order_id:
        filters.append(StockLog.order_id == order_id)
    if type:
        filters.append(StockLog.type == type)
    if date_from:
        filters.append(StockLog.created_at >= date_from)
    if date_to:
        filters.append(StockLog.created_at <= date_to)
    return filters


async def get_stock_logs(
    db: AsyncSession,
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    order_id: Optional[int] = None,
    type: Optional[StockLogType] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 20,
) -> List[StockLog]:
    stmt = (
        select(StockLog)
        .options(
            selectinload(StockLog.product),
            selectinload(StockLog.warehouse),
            selectinload(StockLog.created_by_user),
        )
        .order_by(StockLog.created_at.desc())
    )

    filters = _build_stock_log_filters(
        product_id=product_id, warehouse_id=warehouse_id, order_id=order_id,
        type=type, date_from=date_from, date_to=date_to,
    )
    for f in filters:
        stmt = stmt.where(f)

    stmt = stmt.offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_stock_logs_paginated(
    db: AsyncSession,
    *,
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    order_id: Optional[int] = None,
    type: Optional[StockLogType] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 20,
):
    filters = _build_stock_log_filters(
        product_id=product_id, warehouse_id=warehouse_id, order_id=order_id,
        type=type, date_from=date_from, date_to=date_to,
    )

    stmt = (
        select(StockLog)
        .options(
            selectinload(StockLog.product),
            selectinload(StockLog.warehouse),
            selectinload(StockLog.created_by_user),
        )
        .order_by(StockLog.created_at.desc())
    )
    count_stmt = select(func.count()).select_from(StockLog)
    for f in filters:
        stmt = stmt.where(f)
        count_stmt = count_stmt.where(f)

    total = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(stmt.offset(offset).limit(page_size))
    items = result.scalars().all()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages


async def create_stock_log(db: AsyncSession, data: StockLogCreate) -> StockLog:
    log = StockLog(**data.model_dump())
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log