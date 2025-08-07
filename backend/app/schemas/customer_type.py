from pydantic import BaseModel

class CustomerTypeBase(BaseModel):
    name: str

class CustomerTypeCreate(CustomerTypeBase):
    pass

class CustomerTypeRead(CustomerTypeBase):
    id: int

class CustomerTypeUpdate(BaseModel):
    name: str

    class Config:
        orm_mode = True