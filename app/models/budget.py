from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base

class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("month", "category_id", name="uq_budget_month_category"),
    )

    id = Column(Integer, primary_key=True)
    month = Column(String(7), nullable=False)  # '2025-07'
    category_id = Column(Integer, ForeignKey("cash_flow_categories.id", ondelete="CASCADE"), nullable=False)
    planned_amount = Column(Integer, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    category = relationship("CashFlowCategory")
    creator = relationship("User")