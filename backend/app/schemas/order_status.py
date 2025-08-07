from pydantic import BaseModel

class OrderStatusBase(BaseModel):
    name: str

class OrderStatusCreate(OrderStatusBase):
    pass

class OrderStatusRead(OrderStatusBase):
    id: int

    class Config:
        orm_mode = True