from pydantic import BaseModel, Field
from typing import Optional

class SupplierBase(BaseModel):
    name: str = Field(..., description="Название компании")
    contact_person: Optional[str] = Field(None, description="ФИО контактного лица")
    contact_info: Optional[str] = Field(None, description="Контактная информация (телефон, email)")
    address: Optional[str] = Field(None, description="Адрес поставщика")

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int

    model_config = {
        "from_attributes": True
    }