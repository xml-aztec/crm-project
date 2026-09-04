from sqlalchemy import Column, Integer, ForeignKey, Float, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class SupplyItem(Base):
    __tablename__ = "supply_items"

    id = Column(Integer, primary_key=True)
    supply_id = Column(Integer, ForeignKey("supplies.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    cost_price = Column(Numeric(12, 2), nullable=True)     # Себестоимость
    unit_price = Column(Numeric(12, 2), nullable=True)     # Закупочная цена (если отличается)

    supply = relationship("Supply", back_populates="items")
    product = relationship("Product")