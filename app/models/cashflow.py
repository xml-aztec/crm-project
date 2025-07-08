from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class CashFlow(Base):
    __tablename__ = "cash_flows"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False)
    amount = Column(Integer, nullable=False)  # всегда положительное число
    type_id = Column(Integer, ForeignKey("cash_flow_types.id", ondelete="RESTRICT"), nullable=False)
    category_id = Column(Integer, ForeignKey("cash_flow_categories.id", ondelete="SET NULL"), nullable=True)

    source = Column(String, nullable=True)  # например: "payroll", "order"
    entity_id = Column(Integer, nullable=True)
    description = Column(String, nullable=True)

    type = relationship("CashFlowType")
    category = relationship("CashFlowCategory")