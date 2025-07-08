from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class StockLogType(str, Enum):
    incoming = "incoming"
    outgoing = "outgoing"
    return_ = "return"
    adjust = "adjust"


class StockLogBase(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int
    type: StockLogType
    note: Optional[str] = None


class StockLogCreate(StockLogBase):
    pass


class StockLogOut(StockLogBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True