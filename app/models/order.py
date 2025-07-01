from sqlalchemy import Boolean, Column, Integer, Numeric, ForeignKey, DateTime, Text, Date
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"))
    status_id = Column(Integer, ForeignKey("order_statuses.id", ondelete="SET NULL"))
    
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True)
    installment_months = Column(Integer, nullable=True)

    total_price = Column(Numeric(10, 2), default=0)
    finalized_total_price = Column(Numeric(10, 2), nullable=True) 
    delivery_address = Column(Text, nullable=True)
    delivery_date = Column(Date, nullable=True)
    note = Column(Text, nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    confirmed = Column(Boolean, default=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)

    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    # Relationships
    user = relationship("User")
    customer = relationship("Customer", back_populates="orders")
    status = relationship("OrderStatus", back_populates="orders")
    payment_method = relationship("PaymentMethod")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    warehouse = relationship("Warehouse")
    branch = relationship("Branch")