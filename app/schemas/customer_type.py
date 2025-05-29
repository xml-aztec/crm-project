from pydantic import BaseModel

class CustomerTypeBase(BaseModel):
    name: str

class CustomerTypeCreate(CustomerTypeBase):
    pass

class CustomerTypeRead(CustomerTypeBase):
    id: int

    class Config:
        orm_mode = True