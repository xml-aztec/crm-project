from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    phone = Column(String)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)

    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"))
    position_id = Column(Integer, ForeignKey("positions.id", ondelete="SET NULL"))
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    role = relationship("Role", back_populates="users")
    position = relationship("Position", back_populates="users")
    monthly_targets = relationship("MonthlyTarget", back_populates="manager", cascade="all, delete-orphan")
    branch = relationship("Branch")