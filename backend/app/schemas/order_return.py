from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.order_return import ReturnItemCondition, ReturnStatus
from app.schemas.order_item import OrderItemRead


class ReturnItemCreate(BaseModel):
    order_item_id: int
    quantity: int = Field(..., gt=0)
    condition: ReturnItemCondition
    reason: Optional[str] = None


class ReturnCreate(BaseModel):
    order_id: int
    reason: Optional[str] = None
    items: List[ReturnItemCreate] = Field(..., min_length=1)


class ReturnDecision(BaseModel):
    approve: bool
    reason: Optional[str] = None


class ReturnUserBrief(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: str

    model_config = {"from_attributes": True}


class ReturnItemOut(BaseModel):
    id: int
    order_item_id: int
    quantity: int
    condition: ReturnItemCondition
    reason: Optional[str] = None
    order_item: OrderItemRead

    model_config = {"from_attributes": True}


class ReturnOut(BaseModel):
    id: int
    order_id: int
    status: ReturnStatus
    reason: Optional[str] = None
    created_by: Optional[int] = None
    created_by_user: Optional[ReturnUserBrief] = None
    approved_by: Optional[int] = None
    approved_by_user: Optional[ReturnUserBrief] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    items: List[ReturnItemOut]

    model_config = {"from_attributes": True}
