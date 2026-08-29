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
    order_id: Optional[int] = None
    quantity: int
    type: StockLogType
    note: Optional[str] = None


class StockLogCreate(StockLogBase):
    created_by: Optional[int] = None


class UserBrief(BaseModel):
    id: int
    full_name: str
    model_config = {"from_attributes": True}


class StockLogOut(StockLogBase):
    id: int
    created_at: datetime
    created_by: Optional[int] = None
    created_by_user: Optional[UserBrief] = None
    model_config = {"from_attributes": True}


class StockLogPage(BaseModel):
    items: list[StockLogOut]
    total: int
    page: int
    page_size: int
    total_pages: int
