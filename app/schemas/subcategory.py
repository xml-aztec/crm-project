from pydantic import BaseModel

class SubcategoryBase(BaseModel):
    name: str
    category_id: int

class SubcategoryCreate(SubcategoryBase):
    pass

class SubcategoryRead(SubcategoryBase):
    id: int

    class Config:
        orm_mode = True