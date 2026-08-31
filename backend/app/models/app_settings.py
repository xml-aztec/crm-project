from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AppSettings(Base):
    """Единственная строка глобальных настроек системы (id всегда 1) —
    реквизиты компании и склад/филиал по умолчанию для новых заказов.
    См. app/repositories/app_settings.py::get_settings."""

    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True)
    company_name = Column(String, nullable=True)
    company_logo_url = Column(String, nullable=True)
    company_address = Column(String, nullable=True)
    company_phone = Column(String, nullable=True)
    default_warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    default_branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    default_warehouse = relationship("Warehouse")
    default_branch = relationship("Branch")
