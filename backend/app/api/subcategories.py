from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db, is_admin
from app.repositories import subcategory as subcategory_repo
from app.repositories.subcategory import repo
from app.schemas.subcategory import SubcategoryCreate, SubcategoryPage, SubcategoryRead, SubcategoryUpdate
from app.schemas.common import BulkActionResult, BulkIdsRequest, BulkStatusRequest, BulkStatusResult

router = APIRouter(prefix="/subcategories", tags=["Subcategories"])

@router.get(
    "/",
    response_model=list[SubcategoryRead],
    dependencies=[Depends(get_current_user)],
    summary="Список всех подкатегорий",
    description="Возвращает список всех подкатегорий с привязкой к категориям."
)
async def list_subcategories(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.get(
    "/paginated",
    response_model=SubcategoryPage,
    dependencies=[Depends(get_current_user)],
    summary="Список подкатегорий с пагинацией, поиском и фильтром по категории",
)
async def list_subcategories_paginated(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    category_id: Optional[int] = Query(None),
    sort_by: Literal["name", "created_at", "products_count"] = Query("name"),
    sort_order: Literal["asc", "desc"] = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    items, total, total_pages = await subcategory_repo.get_paginated(
        db,
        search=search,
        is_active=is_active,
        category_id=category_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return SubcategoryPage(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)

@router.post(
    "/",
    response_model=SubcategoryRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(is_admin)],
    summary="Создать подкатегорию",
    description="Создаёт новую подкатегорию, указывая имя и ID категории, к которой она относится."
)
async def create_subcategory(data: SubcategoryCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, name=data.name, category_id=data.category_id)

@router.patch(
    "/{subcategory_id}",
    response_model=SubcategoryRead,
    dependencies=[Depends(is_admin)],
    summary="Обновить подкатегорию",
    description="Обновляет имя подкатегории и/или ID категории, к которой она относится.")
async def update_subcategory(
    subcategory_id: int,
    data: SubcategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    subcategory = await repo.update(db, subcategory_id, data)
    if not subcategory:
        raise HTTPException(status_code=404, detail="Подкатегория не найдена")
    return subcategory

@router.post(
    "/bulk-delete",
    response_model=BulkActionResult,
    dependencies=[Depends(is_admin)],
    summary="Массовое удаление подкатегорий",
    description="Удаляет переданные подкатегории. Подкатегории с товарами пропускаются, если не передан force."
)
async def bulk_delete_subcategories(data: BulkIdsRequest, db: AsyncSession = Depends(get_db)):
    return await subcategory_repo.bulk_delete(db, data.ids, force=data.force)

@router.post(
    "/bulk-status",
    response_model=BulkStatusResult,
    dependencies=[Depends(is_admin)],
    summary="Массовая смена статуса подкатегорий",
)
async def bulk_set_subcategories_status(data: BulkStatusRequest, db: AsyncSession = Depends(get_db)):
    updated = await subcategory_repo.bulk_set_active(db, data.ids, data.is_active)
    return BulkStatusResult(updated=updated)

@router.delete(
    "/{sub_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(is_admin)],
    summary="Удалить подкатегорию",
    description="Удаляет подкатегорию по её ID. Если не найдена — возвращает ошибку 404."
)
async def delete_subcategory(sub_id: int, db: AsyncSession = Depends(get_db)):
    sub = await repo.get_by_id(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    await repo.delete(db, sub_id)
    return {"detail": "Subcategory deleted"}
