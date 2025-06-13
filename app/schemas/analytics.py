from typing import List
from pydantic import BaseModel
from datetime import date
from decimal import Decimal

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