from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.dependencies import get_db, is_admin
from app.schemas.payment_method import *
from app.repositories import payment_method as repo

router = APIRouter(
    prefix="/payment-methods",
    tags=["Payment Methods"], 
)

@router.get(
    "/",
    response_model=List[PaymentMethodOut],
    summary="Получить список способов оплаты",
    description="Возвращает список всех доступных способов оплаты, включая их наценку и срок рассрочки (если есть)."
)
async def list_methods(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post(
    "/",
    response_model=PaymentMethodOut,
    summary="Создать новый способ оплаты",
    description="Создаёт новый способ оплаты. Только админ может использовать этот эндпоинт."
)
async def create_method(
    data: PaymentMethodCreate,
    db: AsyncSession = Depends(get_db),
    _ = Depends(is_admin)
):
    return await repo.create(db, data)

@router.patch(
    "/{id}",
    response_model=PaymentMethodOut,
    summary="Обновить способ оплаты",
    description="Обновляет данные существующего способа оплаты по ID. Только админ может использовать."
)
async def update_method(
    id: int,
    data: PaymentMethodUpdate,
    db: AsyncSession = Depends(get_db),
    _ = Depends(is_admin)
):
    updated = await repo.update(db, id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Метод оплаты не найден")
    return updated

@router.delete(
    "/{id}",
    summary="Удалить способ оплаты",
    description="Удаляет способ оплаты по ID. Только админ может удалить."
)
async def delete_method(
    id: int,
    db: AsyncSession = Depends(get_db),
    _ = Depends(is_admin)
):
    await repo.delete(db, id)
    return {"detail": "Удалено"}