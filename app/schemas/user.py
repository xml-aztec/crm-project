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

    class Config:
        orm_mode = True