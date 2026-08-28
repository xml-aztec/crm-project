from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import Brand
from app.models.product import Product
from app.repositories.base import CRUDRepository

repo = CRUDRepository(Brand)

SORT_COLUMNS = {
    "name": Brand.name,
    "created_at": Brand.created_at,
}


async def get_paginated(
    db: AsyncSession,
    *,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 20,
):
    filters = []
    if search:
        filters.append(Brand.name.ilike(f"%{search}%"))
    if is_active is not None:
        filters.append(Brand.is_active == is_active)

    products_count_sq = (
        select(func.count(Product.id))
        .where(Product.brand_id == Brand.id)
        .correlate(Brand)
        .scalar_subquery()
    )

    query = select(Brand, products_count_sq.label("products_count"))
    count_query = select(func.count()).select_from(Brand)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    sort_column = products_count_sq if sort_by == "products_count" else SORT_COLUMNS.get(sort_by, Brand.name)
    query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())

    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))

    items = []
    for brand, products_count in result.all():
        brand.products_count = products_count
        items.append(brand)

    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages


async def get_delete_impact(db: AsyncSession, brand_id: int) -> dict:
    products_count = (
        await db.execute(select(func.count(Product.id)).where(Product.brand_id == brand_id))
    ).scalar_one()
    return {"products_count": products_count}


async def bulk_delete(db: AsyncSession, ids: list[int], force: bool = False) -> dict:
    deleted: list[int] = []
    skipped: list[dict] = []

    for id_ in ids:
        brand = await repo.get_by_id(db, id_)
        if not brand:
            skipped.append({"id": id_, "reason": "Бренд не найден"})
            continue

        impact = await get_delete_impact(db, id_)
        if not force and impact["products_count"] > 0:
            skipped.append({"id": id_, "reason": f"Привязано товаров: {impact['products_count']}"})
            continue

        await db.delete(brand)
        deleted.append(id_)

    await db.commit()
    return {"deleted": deleted, "skipped": skipped}


async def bulk_set_active(db: AsyncSession, ids: list[int], is_active: bool) -> int:
    result = await db.execute(select(Brand).where(Brand.id.in_(ids)))
    brands = result.scalars().all()
    for brand in brands:
        brand.is_active = is_active
    await db.commit()
    return len(brands)
