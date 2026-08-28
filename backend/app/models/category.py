from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    subcategories = relationship("Subcategory", back_populates="category", cascade="all, delete-orphan")

    __table_args__ = (
        # name already has a unique index via unique=True above
        Index("ix_categories_is_active", "is_active"),
        Index("ix_categories_created_at", "created_at"),
    )
