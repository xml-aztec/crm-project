from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, func, or_, select
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate

async def get_all(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Customer).offset(skip).limit(limit))
    return result.scalars().all()


CUSTOMER_SORT_COLUMNS = {
    "name": Customer.name,
    "email": Customer.email,
    "created_at": Customer.created_at,
}


async def get_paginated(
    db: AsyncSession,
    *,
    search: Optional[str] = None,
    customer_type_id: Optional[int] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 20,
):
    filters = []
    if search:
        pattern = f"%{search}%"
        filters.append(or_(
            Customer.name.ilike(pattern),
            Customer.email.ilike(pattern),
            Customer.phone.ilike(pattern),
        ))
    if customer_type_id is not None:
        filters.append(Customer.customer_type_id == customer_type_id)

    where_clause = and_(*filters) if filters else None
    query = select(Customer)
    count_query = select(func.count()).select_from(Customer)
    if where_clause is not None:
        query = query.where(where_clause)
        count_query = count_query.where(where_clause)

    sort_column = CUSTOMER_SORT_COLUMNS.get(sort_by, Customer.name)
    query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())

    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    items = result.scalars().all()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages

async def get_by_id(db: AsyncSession, customer_id: int):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    return result.scalar_one_or_none()

async def create(db: AsyncSession, data: CustomerCreate):
    new_customer = Customer(**data.model_dump())
    db.add(new_customer)
    await db.commit()
    await db.refresh(new_customer)
    return new_customer

async def update(db: AsyncSession, customer_id: int, data: CustomerUpdate):
    customer = await get_by_id(db, customer_id)
    if not customer:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    await db.commit()
    await db.refresh(customer)
    return customer

async def delete(db: AsyncSession, customer_id: int):
    customer = await get_by_id(db, customer_id)
    if not customer:
        return None
    await db.delete(customer)
    await db.commit()
    return True