from sqlalchemy import Column, Computed, Index, Integer, String
from sqlalchemy.dialects.postgresql import TSVECTOR
from app.core.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    contact_person = Column(String(255), nullable=True)
    contact_info = Column(String(255), nullable=True)
    address = Column(String(500), nullable=True)

    # Полнотекстовый поиск по поставщикам (см. app/api/search.py).
    search_vector = Column(
        TSVECTOR,
        Computed(
            "to_tsvector('russian', coalesce(name,'') || ' ' || coalesce(contact_person,''))",
            persisted=True,
        ),
    )

    __table_args__ = (
        Index("ix_suppliers_search_vector", "search_vector", postgresql_using="gin"),
    )