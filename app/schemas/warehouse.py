from pydantic import BaseModel, Field
from typing import Optional

class WarehouseBase(BaseModel):
    name: str = Field(..., max_length=100)
    location: Optional[str] = None
    branch_id: Optional[int] = None

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = None
    branch_id: Optional[int] = None

class WarehouseOut(BaseModel):
    id: int
    name: str

    model_config = {
        "from_attributes": True
    }