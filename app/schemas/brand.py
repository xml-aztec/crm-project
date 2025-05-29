from pydantic import BaseModel

class BrandBase(BaseModel):
    name: str

class BrandCreate(BrandBase):
    pass

class BrandRead(BrandBase):
    id: int

    class Config:
        orm_mode = True