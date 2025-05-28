from sqlalchemy import Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True)
    email = Column(String, unique=True)
    customer_type_id = Column(Integer, ForeignKey("customer_types.id", ondelete="SET NULL"))
    address = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    customer_type = relationship("CustomerType", back_populates="customers")