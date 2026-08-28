from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.subcategory import Subcategory
from app.repositories.base import CRUDRepository

repo = CRUDRepository(Subcategory)

SORT_COLUMNS = {
    "name": Subcategory.name,
    "created_at": Subcategory.created_at,
}


async def get_paginated(
    db: AsyncSession,
    *,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    category_id: Optional[int] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 20,
):
    filters = []
    if search:
        filters.append(Subcategory.name.ilike(f"%{search}%"))
    if is_active is not None:
        filters.append(Subcategory.is_active == is_active)
    if category_id is not None:
        filters.append(Subcategory.category_id == category_id)

    products_count_sq = (
        select(func.count(Product.id))
        .where(Product.subcategory_id == Subcategory.id)
        .correlate(Subcategory)
        .scalar_subquery()
    )

    query = select(Subcategory, products_count_sq.label("products_count"))
    count_query = select(func.count()).select_from(Subcategory)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    sort_column = products_count_sq if sort_by == "products_count" else SORT_COLUMNS.get(sort_by, Subcategory.name)
    query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())

    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))

    items = []
    for subcategory, products_count in result.all():
        subcategory.products_count = products_count
        items.append(subcategory)

    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages


async def get_delete_impact(db: AsyncSession, subcategory_id: int) -> dict:
    products_count = (
        await db.execute(select(func.count(Product.id)).where(Product.subcategory_id == subcategory_id))
    ).scalar_one()
    return {"products_count": products_count}


async def bulk_delete(db: AsyncSession, ids: list[int], force: bool = False) -> dict:
    deleted: list[int] = []
    skipped: list[dict] = []

    for id_ in ids:
        subcategory = await repo.get_by_id(db, id_)
        if not subcategory:
            skipped.append({"id": id_, "reason": "Подкатегория не найдена"})
            continue

        impact = await get_delete_impact(db, id_)
        if not force and impact["products_count"] > 0:
            skipped.append({"id": id_, "reason": f"Привязано товаров: {impact['products_count']}"})
            continue

        await db.delete(subcategory)
        deleted.append(id_)

    await db.commit()
    return {"deleted": deleted, "skipped": skipped}


async def bulk_set_active(db: AsyncSession, ids: list[int], is_active: bool) -> int:
    result = await db.execute(select(Subcategory).where(Subcategory.id.in_(ids)))
    subcategories = result.scalars().all()
    for subcategory in subcategories:
        subcategory.is_active = is_active
    await db.commit()
    return len(subcategories)
