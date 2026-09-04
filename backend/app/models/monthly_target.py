from sqlalchemy import Column, Integer, Float, ForeignKey, Date, UniqueConstraint, Numeric
from sqlalchemy.orm import relationship
from datetime import date

from app.core.database import Base

class MonthlyTarget(Base):
    __tablename__ = "monthly_targets"
    __table_args__ = (
        UniqueConstraint("manager_id", "month", name="uq_manager_month"),
    )

    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    month = Column(Date, nullable=False)  # Лучше хранить как первое число месяца, например: 2025-06-01
    target_amount = Column(Numeric(12, 2), nullable=False)  # KPI в KGS

    manager = relationship("User", back_populates="monthly_targets")