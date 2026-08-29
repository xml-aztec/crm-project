from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Annotated, List, Optional, Union
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[int] = None
    position_id: Optional[int] = None
    salary_base: Optional[int] = None

class UserRegister(BaseModel):
    """Публичная регистрация: роль и зарплата не выбираются клиентом — назначаются сервером."""
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    position_id: Optional[int] = None
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
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    is_approved: bool
    role_id: Optional[int] = None
    position_id: Optional[int] = None
    is_active: Optional[bool] = None
    salary_base: Optional[int] = None

class UserPage(BaseModel):
    items: List[UserOut]
    total: int
    page: int
    page_size: int
    total_pages: int

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

class PasswordChange(BaseModel):
    current_password: str
    new_password: Annotated[str, Field(min_length=8)]


class UserOutOrder(BaseModel):
    id: int
    full_name: str

    model_config = {
        "from_attributes": True
    }