from typing import List, Optional
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate

async def get_all(db: AsyncSession) -> List[Supplier]:
    result = await db.execute(select(Supplier).order_by(Supplier.name))
    return result.scalars().all()


async def get_paginated(
    db: AsyncSession,
    *,
    search: Optional[str] = None,
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 20,
):
    query = select(Supplier)
    count_query = select(func.count()).select_from(Supplier)

    if search:
        pattern = f"%{search}%"
        condition = or_(
            Supplier.name.ilike(pattern),
            Supplier.contact_person.ilike(pattern),
            Supplier.contact_info.ilike(pattern),
            Supplier.address.ilike(pattern),
        )
        query = query.where(condition)
        count_query = count_query.where(condition)

    query = query.order_by(Supplier.name.desc() if sort_order == "desc" else Supplier.name.asc())

    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    items = result.scalars().all()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages

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