from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class CustomerType(Base):
    __tablename__ = "customer_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  

    customers = relationship("Customer", back_populates="customer_type")