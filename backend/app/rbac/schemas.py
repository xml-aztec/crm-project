from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PermissionOut(BaseModel):
    id: int
    resource: str
    action: str
    code: str

    model_config = {"from_attributes": True}


class RoleCreate(BaseModel):
    name: str
    branch_id: Optional[int] = None
    permission_codes: list[str] = []


class RoleOut(BaseModel):
    id: int
    name: str
    branch_id: Optional[int] = None
    is_system: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
