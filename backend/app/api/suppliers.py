from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.supplier import SupplierOut, SupplierCreate, SupplierUpdate
from app.repositories import supplier as repo
from app.core.dependencies import get_current_user, get_db, is_admin
from app.rbac.dependencies import require_permission

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get(
    "/",
    response_model=List[SupplierOut],
    dependencies=[Depends(get_current_user), Depends(require_permission("supplies.read"))],
    summary="Получить список поставщиков",
    description="Возвращает список всех поставщиков, отсортированных по названию."
)
async def list_suppliers(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.get(
    "/{supplier_id}",
    response_model=SupplierOut,
    dependencies=[Depends(get_current_user)],
    summary="Получить поставщика по ID",
    description="Возвращает поставщика по его ID.",
    responses={404: {"description": "Поставщик не найден"}}
)
async def get_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    supplier = await repo.get_by_id(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Поставщик не найден")
    return supplier

@router.post(
    "/",
    response_model=SupplierOut,
    dependencies=[Depends(is_admin)],
    summary="Создать нового поставщика",
    description="Создаёт нового поставщика. Доступно только администраторам."
)
async def create_supplier(data: SupplierCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data)

@router.patch(
    "/{supplier_id}",
    response_model=SupplierOut,
    dependencies=[Depends(is_admin)],
    summary="Обновить поставщика",
    description="Обновляет данные поставщика. Доступно только администраторам.",
    responses={404: {"description": "Поставщик не найден"}}
)
async def update_supplier(supplier_id: int, data: SupplierUpdate, db: AsyncSession = Depends(get_db)):
    supplier = await repo.update(db, supplier_id, data)
    if not supplier:
        raise HTTPException(status_code=404, detail="Поставщик не найден")
    return supplier

@router.delete(
    "/{supplier_id}",
    status_code=204,
    dependencies=[Depends(is_admin)],
    summary="Удалить поставщика",
    description="Удаляет поставщика по ID. Доступно только администраторам.",
    responses={404: {"description": "Поставщик не найден"}, 204: {"description": "Успешное удаление"}}
)
async def delete_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    success = await repo.delete(db, supplier_id)
    if not success:
        raise HTTPException(status_code=404, detail="Поставщик не найден")