from pydantic import BaseModel, Field
from datetime import date

class MonthlyTargetCreate(BaseModel):
    manager_id: int
    month: date = Field(..., example="2025-07-01", description="Месяц в формате YYYY-MM-DD")
    target_amount: float

class MonthlyTargetOut(BaseModel):
    id: int
    manager_id: int
    month: date
    target_amount: float

    class Config:
        orm_mode = True