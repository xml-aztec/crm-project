from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AppSettingsOut(BaseModel):
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    default_warehouse_id: Optional[int] = None
    default_branch_id: Optional[int] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AppSettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    default_warehouse_id: Optional[int] = None
    default_branch_id: Optional[int] = None
