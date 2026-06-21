from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

ModelType = TypeVar("ModelType")


class CRUDRepository(Generic[ModelType]):
    """Generic async CRUD for simple flat models (id + a few columns)."""

    def __init__(self, model: type[ModelType], order_by=None):
        self.model = model
        self.order_by = order_by if order_by is not None else model.name

    async def get_all(self, db: AsyncSession) -> list[ModelType]:
        result = await db.execute(select(self.model).order_by(self.order_by))
        return result.scalars().all()

    async def get_by_id(self, db: AsyncSession, id_: int) -> ModelType | None:
        result = await db.execute(select(self.model).where(self.model.id == id_))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, **kwargs) -> ModelType:
        obj = self.model(**kwargs)
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj

    async def update(self, db: AsyncSession, id_: int, data: BaseModel) -> ModelType | None:
        obj = await self.get_by_id(db, id_)
        if not obj:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, key, value)
        await db.commit()
        await db.refresh(obj)
        return obj

    async def delete(self, db: AsyncSession, id_: int) -> ModelType | None:
        obj = await self.get_by_id(db, id_)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj
