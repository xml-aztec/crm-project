from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import category as repo
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get(
    "/",
    response_model=list[CategoryRead],
    summary="Список всех категорий",
    description="Возвращает список всех доступных категорий товаров."
)
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post(
    "/",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать новую категорию",
    description="Создаёт новую категорию на основе переданного имени."
)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, name=data.name)

@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    category = await repo.update(db, category_id, data)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return category

@router.delete(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    summary="Удалить категорию",
    description="Удаляет категорию по её ID. Если категория не найдена — возвращает ошибку 404."
)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = await repo.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await repo.delete(db, category_id)
    return {"detail": "Category deleted"}