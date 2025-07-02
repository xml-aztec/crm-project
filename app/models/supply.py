from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Supply(Base):
    __tablename__ = "supplies"

    id = Column(Integer, primary_key=True)
    supplier_name = Column(String(100), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    delivered_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    warehouse = relationship("Warehouse")
    created_user = relationship("User")
    items = relationship("SupplyItem", back_populates="supply", cascade="all, delete")