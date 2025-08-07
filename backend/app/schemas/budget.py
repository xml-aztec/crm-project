from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BudgetBase(BaseModel):
    month: str  # формат YYYY-MM
    category_id: int
    planned_amount: int

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    planned_amount: Optional[int] = None

class BudgetOut(BudgetBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True