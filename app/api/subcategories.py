from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import subcategory as repo
from app.schemas.subcategory import SubcategoryCreate, SubcategoryRead

router = APIRouter(prefix="/subcategories", tags=["Subcategories"])

@router.get(
    "/",
    response_model=list[SubcategoryRead],
    summary="Список всех подкатегорий",
    description="Возвращает список всех подкатегорий с привязкой к категориям."
)
async def list_subcategories(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post(
    "/",
    response_model=SubcategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать подкатегорию",
    description="Создаёт новую подкатегорию, указывая имя и ID категории, к которой она относится."
)
async def create_subcategory(data: SubcategoryCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, name=data.name, category_id=data.category_id)

@router.delete(
    "/{sub_id}",
    status_code=status.HTTP_200_OK,
    summary="Удалить подкатегорию",
    description="Удаляет подкатегорию по её ID. Если не найдена — возвращает ошибку 404."
)
async def delete_subcategory(sub_id: int, db: AsyncSession = Depends(get_db)):
    sub = await repo.get_by_id(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    await repo.delete(db, sub_id)
    return {"detail": "Subcategory deleted"}