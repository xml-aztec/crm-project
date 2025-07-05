from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate

async def get_all(db: AsyncSession) -> List[Supplier]:
    result = await db.execute(select(Supplier).order_by(Supplier.name))
    return result.scalars().all()

async def get_by_id(db: AsyncSession, supplier_id: int) -> Optional[Supplier]:
    return await db.get(Supplier, supplier_id)

async def create(db: AsyncSession, data: SupplierCreate) -> Supplier:
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier

async def update(db: AsyncSession, supplier_id: int, data: SupplierUpdate) -> Optional[Supplier]:
    supplier = await get_by_id(db, supplier_id)
    if not supplier:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    await db.commit()
    await db.refresh(supplier)
    return supplier

async def delete(db: AsyncSession, supplier_id: int) -> bool:
    supplier = await get_by_id(db, supplier_id)
    if not supplier:
        return False
    await db.delete(supplier)
    await db.commit()
    return True