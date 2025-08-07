from pydantic import BaseModel, EmailStr
from typing import List, Optional, Union
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_id: int
    position_id: Optional[int] = None
    salary_base: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime
    is_approved: bool
    is_active: Optional[bool] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position_id: Optional[int] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    salary_base: Optional[int] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    is_approved: bool
    role_id: int
    position_id: Optional[int] = None
    is_active: Optional[bool] = None
    salary_base: Optional[int] = None

class UserStatsOut(BaseModel):
    orders_count: int
    total_income: float

class TopProductOut(BaseModel):
    name: str
    total_sold: int


class UserDetailedStats(BaseModel):
    orders_count: int
    total_income: float
    avg_check: float
    avg_items_per_order: float
    orders_by_clients: List[List[Union[int, int]]]  # [ [count, customer_id], ... ]
    top_products: List[TopProductOut]
    canceled_orders: int
    canceled_share: float

class UserUpdateAdmin(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position_id: Optional[int] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    salary_base: Optional[int] = None

class UserUpdateSelf(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class UserOutOrder(BaseModel):
    id: int
    full_name: str

    model_config = {
        "from_attributes": True
    }