from sqlalchemy import Boolean, Column, Computed, Index, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone

from app.models.payroll import Payroll

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    phone = Column(String)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)

    salary_base = Column(Integer, nullable=False, default=0)

    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"))
    position_id = Column(Integer, ForeignKey("positions.id", ondelete="SET NULL"))
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Полнотекстовый поиск по сотрудникам (см. app/api/search.py).
    search_vector = Column(
        TSVECTOR,
        Computed(
            "to_tsvector('russian', coalesce(full_name,'') || ' ' || coalesce(email,''))",
            persisted=True,
        ),
    )

    payrolls = relationship("Payroll", back_populates="user", cascade="all, delete-orphan", foreign_keys=[Payroll.user_id])
    role = relationship("Role", back_populates="users")
    position = relationship("Position", back_populates="users")
    monthly_targets = relationship("MonthlyTarget", back_populates="manager", cascade="all, delete-orphan")
    branch = relationship("Branch")

    __table_args__ = (
        Index("ix_users_search_vector", "search_vector", postgresql_using="gin"),
    )