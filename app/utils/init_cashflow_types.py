from sqlalchemy import select
from app.models.cashflow_type import CashFlowType

DEFAULT_TYPES = ["income", "expense"]

async def init_cash_flow_types(db):
    for name in DEFAULT_TYPES:
        result = await db.execute(select(CashFlowType).where(CashFlowType.name == name))
        if not result.scalar_one_or_none():
            db.add(CashFlowType(name=name))
    await db.commit()