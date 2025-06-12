from pydantic import BaseModel
from datetime import date

class MonthlyTargetCreate(BaseModel):
    manager_id: int
    month: date  # формат YYYY-MM-01
    target_amount: float

class MonthlyTargetOut(BaseModel):
    id: int
    manager_id: int
    month: date
    target_amount: float

    class Config:
        orm_mode = True