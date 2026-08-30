from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, model_validator


class TaskStatus(str, Enum):
    pending = "pending"
    done = "done"
    cancelled = "cancelled"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_at: datetime
    reminder_at: Optional[datetime] = None
    priority: TaskPriority = TaskPriority.medium
    customer_id: Optional[int] = None
    order_id: Optional[int] = None

    @model_validator(mode="after")
    def _reminder_before_due(self) -> "TaskBase":
        if self.reminder_at is not None and self.reminder_at > self.due_at:
            raise ValueError("Напоминание не может быть позже срока задачи")
        return self


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    customer_id: Optional[int] = None
    order_id: Optional[int] = None

    @model_validator(mode="after")
    def _reminder_before_due(self) -> "TaskUpdate":
        if self.reminder_at is not None and self.due_at is not None and self.reminder_at > self.due_at:
            raise ValueError("Напоминание не может быть позже срока задачи")
        return self


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskRead(TaskBase):
    id: int
    user_id: int
    status: TaskStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TaskPage(BaseModel):
    items: list[TaskRead]
    total: int
    page: int
    page_size: int
    total_pages: int
