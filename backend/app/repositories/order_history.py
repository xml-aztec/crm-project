from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.order_history import OrderHistory


async def add_entry(
    db: AsyncSession,
    order_id: int,
    action: str,
    description: Optional[str] = None,
    user_id: Optional[int] = None,
) -> OrderHistory:
    entry = OrderHistory(
        order_id=order_id,
        action=action,
        description=description,
        user_id=user_id,
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_order_history(db: AsyncSession, order_id: int) -> list[OrderHistory]:
    result = await db.execute(
        select(OrderHistory)
        .options(joinedload(OrderHistory.user))
        .where(OrderHistory.order_id == order_id)
        .order_by(OrderHistory.created_at.asc())
    )
    return result.scalars().all()
