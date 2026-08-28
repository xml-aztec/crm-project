from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # No delete-orphan cascade: deleting a brand must NOT delete its products.
    # The brand_id FK is ondelete="SET NULL" — products get unassigned instead.
    products = relationship("Product", back_populates="brand")

    __table_args__ = (
        # name already has a unique index via unique=True above
        Index("ix_brands_is_active", "is_active"),
        Index("ix_brands_created_at", "created_at"),
    )
