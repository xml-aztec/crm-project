from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import category as repo
from app.schemas.category import CategoryCreate, CategoryRead

router = APIRouter()

@router.get("/", response_model=list[CategoryRead])
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post("/", response_model=CategoryRead)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, name=data.name)

@router.delete("/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = await repo.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await repo.delete(db, category_id)
    return {"detail": "Category deleted"}