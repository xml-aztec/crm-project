from pydantic import BaseModel, Field
from typing import Optional

class CashGapForecastBase(BaseModel):
    month: str = Field(..., example="2025-08", description="Месяц прогноза в формате YYYY-MM")
    expected_income: int = Field(..., ge=0, description="Прогнозируемый доход")
    expected_expense: int = Field(..., ge=0, description="Прогнозируемые расходы")
    comment: Optional[str] = Field(None, description="Дополнительный комментарий")

class CashGapForecastCreate(CashGapForecastBase):
    pass

class CashGapForecastUpdate(BaseModel):
    expected_income: Optional[int] = Field(None, ge=0)
    expected_expense: Optional[int] = Field(None, ge=0)
    comment: Optional[str] = None

class CashGapForecastOut(CashGapForecastBase):
    id: int
    gap_amount: int
    created_by: Optional[int]

    class Config:
        orm_mode = True