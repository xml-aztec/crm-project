from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base
from app.schemas.stock_log import StockLogType

class StockLog(Base):
    __tablename__ = "stock_logs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"))
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    quantity = Column(Integer, nullable=False)
    type = Column(Enum(StockLogType), nullable=False)

    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", lazy="joined")
    warehouse = relationship("Warehouse", lazy="joined")
    order = relationship("Order")
    created_by_user = relationship("User", foreign_keys=[created_by], lazy="joined")