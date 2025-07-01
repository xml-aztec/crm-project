from pydantic import BaseModel
from typing import Optional

class BranchBase(BaseModel):
    name: str
    location: Optional[str] = None

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None

class BranchRead(BranchBase):
    id: int

    class Config:
        orm_mode = True