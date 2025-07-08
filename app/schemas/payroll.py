from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PayrollOut(BaseModel):
    id: int
    user_id: int
    month: str
    base_salary: int
    bonus_amount: int
    penalty_amount: int
    total_paid: int
    paid_at: Optional[datetime]
    comment: Optional[str]

    class Config:
        orm_mode = True