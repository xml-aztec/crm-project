from pydantic import BaseModel, Field
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
    updated_at: datetime

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

class StockListResponse(BaseModel):
    stocks: List[ProductStockOut]
    stats: StockStats

class ProductStockQueryParams(BaseModel):
    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    stock_level: Optional[str] = "all"  # all, in_stock, low_stock, out_of_stock