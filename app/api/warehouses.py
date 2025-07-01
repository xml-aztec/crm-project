from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.dependencies import get_db
from app.schemas.warehouse import WarehouseOut, WarehouseCreate, WarehouseUpdate
from app.repositories import warehouse as repo

router = APIRouter(
    prefix="/warehouses",
    tags=["Warehouses"],
    responses={404: {"description": "Not found"}}
)

@router.get(
    "/",
    response_model=List[WarehouseOut],
    summary="Список всех складов",
    description="Возвращает список всех складов, включая их названия, местоположение и связанные филиалы."
)
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    """
    Получить список всех складов в системе.
    """
    return await repo.get_all(db)

@router.get(
    "/{warehouse_id}",
    response_model=WarehouseOut,
    summary="Получить склад по ID",
    description="Возвращает информацию о складе по его ID. В случае отсутствия — ошибка 404."
)
async def get_warehouse(warehouse_id: int, db: AsyncSession = Depends(get_db)):
    """
    Получить один склад по его уникальному идентификатору.
    """
    warehouse = await repo.get_by_id(db, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse

@router.post(
    "/",
    response_model=WarehouseOut,
    summary="Создать новый склад",
    description="Создает новый склад. Необходимы название и (опционально) местоположение и ID филиала."
)
async def create_warehouse(data: WarehouseCreate, db: AsyncSession = Depends(get_db)):
    """
    Создать склад на основе переданных данных.
    """
    return await repo.create(db, data.model_dump())

@router.patch(
    "/{warehouse_id}",
    response_model=WarehouseOut,
    summary="Обновить склад",
    description="Позволяет изменить название, местоположение или привязку к филиалу по ID склада."
)
async def update_warehouse(warehouse_id: int, data: WarehouseUpdate, db: AsyncSession = Depends(get_db)):
    """
    Обновить данные склада. Изменяются только переданные поля.
    """
    warehouse = await repo.update(db, warehouse_id, data.model_dump(exclude_unset=True))
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse

@router.delete(
    "/{warehouse_id}",
    summary="Удалить склад",
    description="Удаляет склад по ID. Если склад не найден — возвращает ошибку 404."
)
async def delete_warehouse(warehouse_id: int, db: AsyncSession = Depends(get_db)):
    """
    Удалить склад по ID.
    """
    success = await repo.delete(db, warehouse_id)
    if not success:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"message": "Warehouse deleted"}