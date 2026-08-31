from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ReturnStatus(str, Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class ReturnItemCondition(str, Enum):
    resalable = "resalable"
    defective = "defective"


class OrderReturn(Base):
    __tablename__ = "order_returns"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(ReturnStatus), nullable=False, default=ReturnStatus.requested)
    reason = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)

    order = relationship("Order")
    created_by_user = relationship("User", foreign_keys=[created_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    items = relationship("OrderReturnItem", back_populates="order_return", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_order_returns_order_id", "order_id"),
        Index("ix_order_returns_status", "status"),
    )


class OrderReturnItem(Base):
    __tablename__ = "order_return_items"

    id = Column(Integer, primary_key=True, index=True)
    order_return_id = Column(Integer, ForeignKey("order_returns.id", ondelete="CASCADE"), nullable=False)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    condition = Column(SAEnum(ReturnItemCondition), nullable=False)
    reason = Column(Text, nullable=True)

    order_return = relationship("OrderReturn", back_populates="items")
    order_item = relationship("OrderItem")
