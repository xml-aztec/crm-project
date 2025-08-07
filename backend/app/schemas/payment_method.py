from pydantic import BaseModel
from typing import Optional

class PaymentMethodBase(BaseModel):
    name: str
    surcharge_percent: float
    max_months: Optional[int] = None

class PaymentMethodCreate(PaymentMethodBase):
    pass

class PaymentMethodUpdate(PaymentMethodBase):
    pass

class PaymentMethodOut(PaymentMethodBase):
    id: int

    class Config:
        orm_mode = True