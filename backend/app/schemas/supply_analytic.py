from pydantic import BaseModel
from datetime import date

class SupplyDailyStats(BaseModel):
    date: date
    supply_count: int
    total_quantity: float
    total_supply_sum: float

class TopSupplier(BaseModel):
    supplier_name: str
    supply_count: int
    total_quantity: float
    total_supply_sum: float

class TopSuppliedProduct(BaseModel):
    product_id: int
    product_name: str
    supply_count: int
    total_quantity: float
    total_supply_sum: float