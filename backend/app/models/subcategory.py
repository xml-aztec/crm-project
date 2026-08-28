from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    category = relationship("Category", back_populates="subcategories")
    # No delete-orphan cascade: deleting a subcategory must NOT delete its products.
    # The products_id FK is ondelete="SET NULL" — products get unassigned instead.
    products = relationship("Product", back_populates="subcategory")

    __table_args__ = (
        Index("ix_subcategories_name", "name"),
        Index("ix_subcategories_is_active", "is_active"),
        Index("ix_subcategories_created_at", "created_at"),
        Index("ix_subcategories_category_id", "category_id"),
    )
