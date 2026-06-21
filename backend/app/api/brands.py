from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories.brand import repo
from app.schemas.brand import BrandCreate, BrandRead, BrandUpdate

router = APIRouter(prefix="/brands", tags=["Brands"])

@router.get(
    "/",
    response_model=list[BrandRead],
    summary="Список брендов",
    description="Возвращает список всех брендов, доступных в системе."
)
async def list_brands(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post(
    "/",
    response_model=BrandRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать бренд",
    description="Создаёт новый бренд по переданному имени."
)
async def create_brand(data: BrandCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, name=data.name)

@router.patch("/{brand_id}", response_model=BrandRead)
async def update_brand(
    brand_id: int,
    data: BrandUpdate,
    db: AsyncSession = Depends(get_db),
):
    brand = await repo.update(db, brand_id, data)
    if not brand:
        raise HTTPException(status_code=404, detail="Бренд не найден")
    return brand

@router.delete(
    "/{brand_id}",
    status_code=status.HTTP_200_OK,
    summary="Удалить бренд",
    description="Удаляет бренд по ID. Возвращает 404, если бренд не найден."
)
async def delete_brand(brand_id: int, db: AsyncSession = Depends(get_db)):
    brand = await repo.get_by_id(db, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    await repo.delete(db, brand_id)
    return {"detail": "Brand deleted"}