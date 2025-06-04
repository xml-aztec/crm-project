from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_id: int
    position_id: Optional[int] = None

class UserCreate(UserBase):
    password: str 

class UserRead(UserBase):
    id: int
    created_at: datetime
    is_approved: bool

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position_id: Optional[int] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    is_approved: bool
    role_id: int
    position_id: Optional[int] = None

    class Config:
        orm_mode = True