from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CashGapForecast(Base):
    __tablename__ = "cash_gap_forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    month = Column(String(7), nullable=False)  # '2025-07'
    expected_income = Column(Integer, nullable=False)
    expected_expense = Column(Integer, nullable=False)
    gap_amount = Column(Integer, nullable=False)  # expense - income
    comment = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))

    creator = relationship("User")