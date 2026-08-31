from sqlalchemy import Column, Computed, ForeignKey, Index, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True)
    email = Column(String, unique=True)
    customer_type_id = Column(Integer, ForeignKey("customer_types.id", ondelete="SET NULL"))
    address = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Полнотекстовый поиск (см. app/api/search.py) — генерируется БД из
    # name/phone/email, поэтому никогда не устанавливается из Python-кода.
    search_vector = Column(
        TSVECTOR,
        Computed(
            "to_tsvector('russian', coalesce(name,'') || ' ' || coalesce(phone,'') || ' ' || coalesce(email,''))",
            persisted=True,
        ),
    )

    orders = relationship("Order", back_populates="customer")
    customer_type = relationship("CustomerType", back_populates="customers")

    __table_args__ = (
        Index("ix_customers_search_vector", "search_vector", postgresql_using="gin"),
    )