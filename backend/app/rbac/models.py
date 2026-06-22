from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    resource = Column(String, nullable=False)
    action = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False, index=True)

    role_permissions = relationship(
        "RbacRolePermission", back_populates="permission", cascade="all, delete-orphan"
    )


class RbacRole(Base):
    """RBAC role with granular permissions. Separate from the legacy `roles` table
    (app.models.role.Role), which is still the source of truth for access checks
    until Stage C is approved."""

    __tablename__ = "rbac_roles"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    branch = relationship("Branch")
    role_permissions = relationship(
        "RbacRolePermission", back_populates="role", cascade="all, delete-orphan"
    )
    user_roles = relationship(
        "RbacUserRole", back_populates="role", cascade="all, delete-orphan"
    )


class RbacRolePermission(Base):
    __tablename__ = "rbac_role_permissions"

    role_id = Column(Integer, ForeignKey("rbac_roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(
        Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True
    )

    role = relationship("RbacRole", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")


class RbacUserRole(Base):
    __tablename__ = "rbac_user_roles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("rbac_roles.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User")
    role = relationship("RbacRole", back_populates="user_roles")
