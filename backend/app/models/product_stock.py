from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone

class ProductStock(Base):
    __tablename__ = "product_stock"

    id = Column(Integer, primary_key=True, index=True) 
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product")
    warehouse = relationship("Warehouse")

    __table_args__ = (
        UniqueConstraint("product_id", "warehouse_id", name="uix_product_warehouse"),
    )