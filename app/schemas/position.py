from pydantic import BaseModel

class PositionBase(BaseModel):
    title: str

class PositionCreate(PositionBase):
    pass

class PositionRead(PositionBase):
    id: int

    class Config:
        orm_mode = True