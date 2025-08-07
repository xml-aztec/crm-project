from sqlalchemy import Column, Integer, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class KpiRule(Base):
    __tablename__ = "kpi_rules"

    id = Column(Integer, primary_key=True)
    min_percent = Column(Float, nullable=False)  # Например: 0.8 — это 80%
    bonus = Column(Integer, nullable=True)
    penalty = Column(Integer, nullable=True)

    payrolls = relationship("Payroll", back_populates="kpi_rule")
    