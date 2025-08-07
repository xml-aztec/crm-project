from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True) 
    contact_person = Column(String(255), nullable=True)      
    contact_info = Column(String(255), nullable=True)       
    address = Column(String(500), nullable=True)            