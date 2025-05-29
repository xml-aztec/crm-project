from pydantic import BaseModel

class PositionBase(BaseModel):
    name: str

class PositionCreate(PositionBase):
    pass

class PositionRead(PositionBase):
    id: int

    class Config:
        orm_mode = True