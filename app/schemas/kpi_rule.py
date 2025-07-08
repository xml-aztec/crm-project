from pydantic import BaseModel
from typing import Optional

class KpiRuleBase(BaseModel):
    min_percent: float  # от 0.0 до 1.0
    bonus: Optional[int] = None
    penalty: Optional[int] = None

class KpiRuleCreate(KpiRuleBase):
    pass

class KpiRuleOut(KpiRuleBase):
    id: int

    class Config:
        orm_mode = True

class KpiRuleUpdate(BaseModel):
    min_percent: Optional[float] = None
    bonus: Optional[int] = None
    penalty: Optional[int] = None