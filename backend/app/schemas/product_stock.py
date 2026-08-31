from pydantic import BaseModel, Field, computed_field
from typing import List, Optional
from datetime import datetime

class ProductStockBase(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int

class ProductStockCreate(ProductStockBase):
    pass

class ProductStockOut(ProductStockBase):
    id: int
    reserved: int = 0
    defective_quantity: int = 0
    updated_at: datetime

    @computed_field
    @property
    def available(self) -> int:
        return max(0, self.quantity - self.reserved)

    model_config = {
        "from_attributes": True
    }

class ProductStockUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=0)

    model_config = {
        "from_attributes": True
    }

class StockStats(BaseModel):
    total: int
    in_stock: int
    low_stock: int
    out_of_stock: int
    total_quantity: int

class StockListResponse(BaseModel):
    stocks: List[ProductStockOut]
    stats: StockStats

class StockTransferRequest(BaseModel):
    from_warehouse_id: int
    to_warehouse_id: int
    product_id: int
    quantity: int = Field(..., gt=0)

class ProductStockQueryParams(BaseModel):
    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    stock_level: Optional[str] = "all"  # all, in_stock, low_stock, out_of_stock
