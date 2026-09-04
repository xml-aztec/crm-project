from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class Payroll(Base):
    __tablename__ = "payrolls"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    month = Column(String(7))  # '2025-07'
    base_salary = Column(Integer, nullable=False)
    bonus_amount = Column(Integer, default=0)
    penalty_amount = Column(Integer, default=0)
    total_paid = Column(Integer, nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    comment = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))

    # Numeric, а не Integer: в колонку пишется значение вида 87.35, и
    # PostgreSQL молча округлял его до 87 — процент выполнения плана терял
    # дробную часть на пути в базу.
    kpi_percent = Column(Numeric(6, 2), nullable=True)
    kpi_rule_id = Column(Integer, ForeignKey("kpi_rules.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="payrolls", foreign_keys=[user_id])
    kpi_rule = relationship("KpiRule", back_populates="payrolls", foreign_keys=[kpi_rule_id])