from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.product import Product
from app.models.subcategory import Subcategory
from app.repositories.base import CRUDRepository

repo = CRUDRepository(Category)

SORT_COLUMNS = {
    "name": Category.name,
    "created_at": Category.created_at,
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
        filters.append(Category.name.ilike(f"%{search}%"))
    if is_active is not None:
        filters.append(Category.is_active == is_active)

    products_count_sq = (
        select(func.count(Product.id))
        .where(Product.category_id == Category.id)
        .correlate(Category)
        .scalar_subquery()
    )
    subcategories_count_sq = (
        select(func.count(Subcategory.id))
        .where(Subcategory.category_id == Category.id)
        .correlate(Category)
        .scalar_subquery()
    )

    query = select(Category, products_count_sq.label("products_count"), subcategories_count_sq.label("subcategories_count"))
    count_query = select(func.count()).select_from(Category)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    if sort_by == "products_count":
        sort_column = products_count_sq
    elif sort_by == "subcategories_count":
        sort_column = subcategories_count_sq
    else:
        sort_column = SORT_COLUMNS.get(sort_by, Category.name)
    query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())

    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))

    items = []
    for category, products_count, subcategories_count in result.all():
        category.products_count = products_count
        category.subcategories_count = subcategories_count
        items.append(category)

    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages


async def get_delete_impact(db: AsyncSession, category_id: int) -> dict:
    products_count = (
        await db.execute(select(func.count(Product.id)).where(Product.category_id == category_id))
    ).scalar_one()
    subcategories_count = (
        await db.execute(select(func.count(Subcategory.id)).where(Subcategory.category_id == category_id))
    ).scalar_one()
    return {"products_count": products_count, "subcategories_count": subcategories_count}


async def bulk_delete(db: AsyncSession, ids: list[int], force: bool = False) -> dict:
    deleted: list[int] = []
    skipped: list[dict] = []

    for id_ in ids:
        category = await repo.get_by_id(db, id_)
        if not category:
            skipped.append({"id": id_, "reason": "Категория не найдена"})
            continue

        impact = await get_delete_impact(db, id_)
        if not force and (impact["products_count"] > 0 or impact["subcategories_count"] > 0):
            skipped.append({
                "id": id_,
                "reason": f"Привязано товаров: {impact['products_count']}, подкатегорий: {impact['subcategories_count']}",
            })
            continue

        await db.delete(category)
        deleted.append(id_)

    await db.commit()
    return {"deleted": deleted, "skipped": skipped}


async def bulk_set_active(db: AsyncSession, ids: list[int], is_active: bool) -> int:
    result = await db.execute(select(Category).where(Category.id.in_(ids)))
    categories = result.scalars().all()
    for category in categories:
        category.is_active = is_active
    await db.commit()
    return len(categories)
