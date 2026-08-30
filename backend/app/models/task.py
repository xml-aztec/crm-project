from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.schemas.task import TaskPriority, TaskStatus


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=False, index=True)
    reminder_at = Column(DateTime(timezone=True), nullable=True, index=True)
    # Атомарная метка идемпотентности для фоновой обработки напоминаний —
    # см. repositories/task.py::claim_due_reminders.
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)

    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.pending)
    priority = Column(Enum(TaskPriority), nullable=False, default=TaskPriority.medium)

    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User")
    customer = relationship("Customer")
    order = relationship("Order")
