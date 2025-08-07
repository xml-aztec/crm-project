from sqlalchemy import Column, Integer, String
from app.core.database import Base


class CashFlowType(Base):
    __tablename__ = "cash_flow_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)  # "income", "expense"