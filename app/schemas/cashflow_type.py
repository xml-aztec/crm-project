from pydantic import BaseModel

class CashFlowTypeCreate(BaseModel):
    name: str

class CashFlowTypeUpdate(BaseModel):
    name: str

class CashFlowTypeOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True