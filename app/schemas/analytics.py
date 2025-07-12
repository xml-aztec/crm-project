from typing import List, Optional
from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from enum import Enum

class DailyIncome(BaseModel):
    date: date
    total_income: Decimal

class DailyOrders(BaseModel):
    date: date
    order_count: int

class ManagerIncome(BaseModel):
    manager_id: int
    full_name: str
    total_income: Decimal

class OrderStatusCount(BaseModel):
    status_name: str
    count: int

class StatusCount(BaseModel):
    status_id: int
    count: int

class OrderSummary(BaseModel):
    total_orders: int
    total_income: Decimal
    average_order_value: Decimal
    unique_customers: int
    status_counts: List[StatusCount]

class MonthlyTargetAnalytics(BaseModel):
    target: float
    revenue: float
    today_revenue: float
    progress_percent: float

class KPILeaderboardItem(BaseModel):
    manager_id: int
    manager_name: str
    target: Decimal
    revenue: Decimal
    progress_percent: float

class LeaderboardEntry(BaseModel):
    manager_id: int
    manager_name: str
    revenue: float
    target: float
    progress_percent: float

class MonthlySummaryResponse(BaseModel):
    total_orders: int
    total_income: float
    average_order_value: float
    unique_customers: int
    status_counts: List[StatusCount]

class ExtendedKPIItem(BaseModel):
    manager_id: int
    manager_name: str
    target: float
    revenue: float
    progress_percent: float
    orders_count: int
    average_check: float

class ExtendedKPIAnalytics(BaseModel):
    avg_kpi: float
    top_performer: Optional[ExtendedKPIItem]
    worst_performer: Optional[ExtendedKPIItem]
    managers: List[ExtendedKPIItem]

class TopSuppliedProduct(BaseModel):
    product_id: int
    product_name: str
    total_supplied: int

class ABCGroup(str, Enum):
    A = "A"
    B = "B"
    C = "C"

class ABCAnalysisEntry(BaseModel):
    product_id: int
    product_name: str
    total_quantity: int
    total_revenue: float
    group: ABCGroup