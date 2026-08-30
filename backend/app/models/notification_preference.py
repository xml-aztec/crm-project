from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.schemas.notification_preference import NotificationChannel


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type_id = Column(
        Integer, ForeignKey("notification_types.id", ondelete="CASCADE"), nullable=False
    )
    channel = Column(Enum(NotificationChannel), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User")
    notification_type = relationship("NotificationType")

    __table_args__ = (
        UniqueConstraint(
            "user_id", "notification_type_id", "channel", name="uq_notif_pref_user_type_channel"
        ),
    )
