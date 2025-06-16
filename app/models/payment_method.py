from sqlalchemy import Column, Integer, String, Numeric, Text
from app.core.database import Base

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)  # Например: "Рассрочка (MPlus)"
    surcharge_percent = Column(Numeric(5, 2), default=0.0)  # Наценка %
    max_months = Column(Integer, nullable=True)  # Срок до N мес., если рассрочка