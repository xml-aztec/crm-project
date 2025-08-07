from sqlalchemy import select
from app.models.order_status import OrderStatus

DEFAULT_ORDER_STATUSES = [
    "Новый",
    "В работе",
    "Завершен",
    "Отменен"
]

async def init_order_statuses(db):
    for name in DEFAULT_ORDER_STATUSES:
        result = await db.execute(select(OrderStatus).where(OrderStatus.name == name))
        if not result.scalar_one_or_none():
            db.add(OrderStatus(name=name))
    await db.commit()