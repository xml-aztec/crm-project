from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    title: str
    message: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    type: Optional[str] = None
    entity_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationPage(BaseModel):
    items: list[NotificationOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class UnreadCountOut(BaseModel):
    count: int
