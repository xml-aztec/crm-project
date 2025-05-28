from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    description = Column(Text)
    image_url = Column(Text)

    subcategory_id = Column(Integer, ForeignKey("subcategories.id", ondelete="CASCADE"), nullable=False)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="SET NULL"))

    subcategory = relationship("Subcategory", back_populates="products")
    brand = relationship("Brand", back_populates="products")