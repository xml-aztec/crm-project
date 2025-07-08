from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class CashFlowCategory(Base):
    __tablename__ = "cash_flow_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)  # "salary", "order_payment", "supply_payment"
    type_id = Column(Integer, ForeignKey("cash_flow_types.id", ondelete="CASCADE"))

    type = relationship("CashFlowType")