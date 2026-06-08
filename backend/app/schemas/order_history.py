from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HistoryUserOut(BaseModel):
    id: int
    full_name: str
    model_config = {"from_attributes": True}


class OrderHistoryOut(BaseModel):
    id: int
    order_id: int
    action: str
    description: Optional[str] = None
    created_at: datetime
    user: Optional[HistoryUserOut] = None
    model_config = {"from_attributes": True}
