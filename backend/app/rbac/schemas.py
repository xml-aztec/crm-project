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


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    permission_codes: Optional[list[str]] = None


class RoleOut(BaseModel):
    id: int
    name: str
    branch_id: Optional[int] = None
    is_system: bool
    created_at: datetime
    updated_at: datetime
    permission_codes: list[str] = []
    user_count: int = 0

    model_config = {"from_attributes": True}


class RoleAssign(BaseModel):
    user_id: int


class RoleUserOut(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: str

    model_config = {"from_attributes": True}
