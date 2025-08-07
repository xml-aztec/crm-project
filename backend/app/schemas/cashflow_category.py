from pydantic import BaseModel

class CashFlowCategoryCreate(BaseModel):
    name: str

class CashFlowCategoryUpdate(BaseModel):
    name: str

class CashFlowCategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True