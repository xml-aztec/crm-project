from sqlalchemy import Column, Computed, Index, Integer, String, Float, Boolean, ForeignKey, UniqueConstraint, Numeric
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import relationship
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    detail = Column(String(500), nullable=True)
    cost_price = Column(Numeric(12, 2), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    sku = Column(String, unique=True, nullable=False)
    barcode = Column(String, unique=True, nullable=True)

    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True)

    # Полнотекстовый поиск (см. app/api/search.py).
    search_vector = Column(
        TSVECTOR,
        Computed(
            "to_tsvector('russian', coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(barcode,''))",
            persisted=True,
        ),
    )

    category = relationship("Category")
    subcategory = relationship("Subcategory", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    images = relationship(
        "ProductImage",
        back_populates="product",
        order_by="ProductImage.position",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("sku", name="uq_product_sku"),
        Index("ix_products_search_vector", "search_vector", postgresql_using="gin"),
    )