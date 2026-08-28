from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db, is_admin
from app.repositories import category as category_repo
from app.repositories.category import repo
from app.schemas.category import CategoryCreate, CategoryPage, CategoryRead, CategoryUpdate
from app.schemas.common import BulkActionResult, BulkIdsRequest, BulkStatusRequest, BulkStatusResult

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get(
    "/",
    response_model=list[CategoryRead],
    dependencies=[Depends(get_current_user)],
    summary="Список всех категорий",
    description="Возвращает список всех доступных категорий товаров."
)
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.get(
    "/paginated",
    response_model=CategoryPage,
    dependencies=[Depends(get_current_user)],
    summary="Список категорий с пагинацией и поиском",
    description="Серверная пагинация, поиск по названию, фильтр по статусу и сортировка."
)
async def list_categories_paginated(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: Literal["name", "created_at", "products_count", "subcategories_count"] = Query("name"),
    sort_order: Literal["asc", "desc"] = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    items, total, total_pages = await category_repo.get_paginated(
        db,
        search=search,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return CategoryPage(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)

@router.post(
    "/",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(is_admin)],
    summary="Создать новую категорию",
    description="Создаёт новую категорию на основе переданного имени."
)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, name=data.name)

@router.patch("/{category_id}", response_model=CategoryRead, dependencies=[Depends(is_admin)])
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    category = await repo.update(db, category_id, data)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return category

@router.post(
    "/bulk-delete",
    response_model=BulkActionResult,
    dependencies=[Depends(is_admin)],
    summary="Массовое удаление категорий",
    description="Удаляет переданные категории. Категории с товарами или подкатегориями пропускаются, если не передан force."
)
async def bulk_delete_categories(data: BulkIdsRequest, db: AsyncSession = Depends(get_db)):
    return await category_repo.bulk_delete(db, data.ids, force=data.force)

@router.post(
    "/bulk-status",
    response_model=BulkStatusResult,
    dependencies=[Depends(is_admin)],
    summary="Массовая смена статуса категорий",
)
async def bulk_set_categories_status(data: BulkStatusRequest, db: AsyncSession = Depends(get_db)):
    updated = await category_repo.bulk_set_active(db, data.ids, data.is_active)
    return BulkStatusResult(updated=updated)

@router.delete(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(is_admin)],
    summary="Удалить категорию",
    description="Удаляет категорию по её ID. Если категория не найдена — возвращает ошибку 404."
)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = await repo.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await repo.delete(db, category_id)
    return {"detail": "Category deleted"}
