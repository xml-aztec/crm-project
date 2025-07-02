from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.dependencies import get_db, is_admin
from app.schemas.supply import SupplyCreate, SupplyOut
from app.repositories import supply as repo

router = APIRouter(prefix="/supplies", tags=["Supplies"])

@router.post(
    "/", 
    response_model=SupplyOut,
    summary="Создать поставку",
    description="Создаёт новую поставку и обновляет остатки на складе. Доступно только администратору.",
    dependencies=[Depends(is_admin)]
)
async def create_supply(data: SupplyCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create_supply(db, data)

@router.get(
    "/", 
    response_model=List[SupplyOut],
    summary="Список поставок",
    description="Получить список всех поставок, отсортированных по дате создания. Доступно админам."
)
async def list_supplies(db: AsyncSession = Depends(get_db)):
    return await repo.get_all_supplies(db)

@router.get(
    "/{supply_id}", 
    response_model=SupplyOut,
    summary="Получить поставку по ID",
    description="Получить подробную информацию о конкретной поставке и её позициях."
)
async def get_supply(supply_id: int, db: AsyncSession = Depends(get_db)):
    supply = await repo.get_supply_by_id(db, supply_id)
    if not supply:
        raise HTTPException(status_code=404, detail="Поставка не найдена")
    return supply