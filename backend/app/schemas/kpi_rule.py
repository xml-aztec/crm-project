from pydantic import BaseModel, Field
from typing import Optional


class KpiRuleBase(BaseModel):
    min_percent: float = Field(..., ge=0.0, le=100.0, description="Минимальный процент выполнения KPI (0–100)")
    bonus: Optional[int] = Field(None, ge=0, description="Бонус в % от оклада")
    penalty: Optional[int] = Field(None, ge=0, description="Штраф в % от оклада")

class KpiRuleCreate(KpiRuleBase):
    pass

class KpiRuleOut(KpiRuleBase):
    id: int

    class Config:
        orm_mode = True

class KpiRuleUpdate(BaseModel):
    min_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    bonus: Optional[int] = Field(None, ge=0)
    penalty: Optional[int] = Field(None, ge=0)