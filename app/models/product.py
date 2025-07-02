from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    detail = Column(String(500), nullable=True)
    cost_price = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    barcode = Column(String, unique=True, nullable=True)

    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True)

    category = relationship("Category")
    subcategory = relationship("Subcategory")
    brand = relationship("Brand")

    __table_args__ = (
        UniqueConstraint("sku", name="uq_product_sku"),
    )