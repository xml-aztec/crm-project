from datetime import date
from typing import Optional
from pydantic import BaseModel

class CashFlowOut(BaseModel):
    id: int
    date: date
    amount: int
    type: str  
    category: Optional[str] = None  
    source: Optional[str] = None  
    entity_id: Optional[int] = None
    description: Optional[str] = None

    class Config:
        orm_mode = True