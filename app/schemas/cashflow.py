from datetime import date
from typing import Optional
from pydantic import BaseModel

from app.schemas.cashflow_category import CashFlowCategoryOut
from app.schemas.cashflow_type import CashFlowTypeOut


class CashFlowOut(BaseModel):
    id: int
    date: date
    amount: int
    type: CashFlowTypeOut
    category: Optional[CashFlowCategoryOut] = None
    source: Optional[str] = None
    entity_id: Optional[int] = None
    description: Optional[str] = None

    class Config:
        orm_mode = True