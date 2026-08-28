from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db, is_admin
from app.repositories import brand as brand_repo
from app.repositories.brand import repo
from app.schemas.brand import BrandCreate, BrandPage, BrandRead, BrandUpdate
from app.schemas.common import BulkActionResult, BulkIdsRequest, BulkStatusRequest, BulkStatusResult

router = APIRouter(prefix="/brands", tags=["Brands"])

@router.get(
    "/",
    response_model=list[BrandRead],
    dependencies=[Depends(get_current_user)],
    summary="Список брендов",
    description="Возвращает список всех брендов, доступных в системе."
)
async def list_brands(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.get(
    "/paginated",
    response_model=BrandPage,
    dependencies=[Depends(get_current_user)],
    summary="Список брендов с пагинацией и поиском",
)
async def list_brands_paginated(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: Literal["name", "created_at", "products_count"] = Query("name"),
    sort_order: Literal["asc", "desc"] = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    items, total, total_pages = await brand_repo.get_paginated(
        db,
        search=search,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return BrandPage(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)

@router.post(
    "/",
    response_model=BrandRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(is_admin)],
    summary="Создать бренд",
    description="Создаёт новый бренд по переданному имени."
)
async def create_brand(data: BrandCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, name=data.name)

@router.patch("/{brand_id}", response_model=BrandRead, dependencies=[Depends(is_admin)])
async def update_brand(
    brand_id: int,
    data: BrandUpdate,
    db: AsyncSession = Depends(get_db),
):
    brand = await repo.update(db, brand_id, data)
    if not brand:
        raise HTTPException(status_code=404, detail="Бренд не найден")
    return brand

@router.post(
    "/bulk-delete",
    response_model=BulkActionResult,
    dependencies=[Depends(is_admin)],
    summary="Массовое удаление брендов",
    description="Удаляет переданные бренды. Бренды с товарами пропускаются, если не передан force."
)
async def bulk_delete_brands(data: BulkIdsRequest, db: AsyncSession = Depends(get_db)):
    return await brand_repo.bulk_delete(db, data.ids, force=data.force)

@router.post(
    "/bulk-status",
    response_model=BulkStatusResult,
    dependencies=[Depends(is_admin)],
    summary="Массовая смена статуса брендов",
)
async def bulk_set_brands_status(data: BulkStatusRequest, db: AsyncSession = Depends(get_db)):
    updated = await brand_repo.bulk_set_active(db, data.ids, data.is_active)
    return BulkStatusResult(updated=updated)

@router.delete(
    "/{brand_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(is_admin)],
    summary="Удалить бренд",
    description="Удаляет бренд по ID. Возвращает 404, если бренд не найден."
)
async def delete_brand(brand_id: int, db: AsyncSession = Depends(get_db)):
    brand = await repo.get_by_id(db, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    await repo.delete(db, brand_id)
    return {"detail": "Brand deleted"}
