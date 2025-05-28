from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"))
    status_id = Column(Integer, ForeignKey("order_statuses.id", ondelete="SET NULL"))
    total_price = Column(Numeric(10, 2), default=0)
    note = Column(Text, nullable=True) 
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    

    customer = relationship("Customer", back_populates="orders")
    status = relationship("OrderStatus", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")