from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.core.database import Base


class NotificationType(Base):
    """Справочник типов события для уведомлений — расширяемый данными, а не
    кодом: чтобы добавить новый тип, достаточно вставить строку (см.
    utils/init_notification_types.py), без изменения бизнес-логики.

    Не является FK для notifications.type (тот остаётся свободной строкой,
    как и раньше, чтобы не трогать существующих продюсеров уведомлений) —
    эта таблица только задаёт список типов и дефолты для notification_preferences.
    """

    __tablename__ = "notification_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    label = Column(String, nullable=False)
    default_email_enabled = Column(Boolean, nullable=False, default=True)
    default_in_app_enabled = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
