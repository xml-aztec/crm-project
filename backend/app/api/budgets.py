from fastapi import APIRouter, Depends, Query, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.dependencies import get_db, is_admin
from app.models.user import User
from app.schemas.budget import BudgetOut, BudgetCreate, BudgetUpdate
from app.repositories.budget import (
    get_budgets, create_budget, update_budget_by_id, delete_budget_by_id
)

router = APIRouter(prefix="/budgets", tags=["Budget"])


@router.get(
    "/",
    response_model=List[BudgetOut],
    summary="Список бюджетов",
    description="""
    Возвращает список всех бюджетов.

    Можно отфильтровать по месяцу (`month` в формате YYYY-MM).
    
    Требуется авторизация администратора.
    """
)
async def list_budgets(
    month: Optional[str] = Query(None, description="Фильтрация по месяцу в формате YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await get_budgets(db, month=month)


@router.post(
    "/",
    response_model=BudgetOut,
    summary="Создание бюджета",
    description="""
    Создаёт новый бюджет на указанный месяц и категорию денежных потоков.

    Требуется авторизация администратора.
    """
)
async def create_budget_endpoint(
    data: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(is_admin)
):
    return await create_budget(db, data.model_dump(), user_id=user.id)


@router.patch(
    "/{budget_id}",
    response_model=BudgetOut,
    summary="Обновление бюджета",
    description="""
    Обновляет существующий бюджет по ID.

    Можно изменить сумму (`amount`) или комментарий (`comment`).
    
    Требуется авторизация администратора.
    """
)
async def update_budget_endpoint(
    data: BudgetUpdate,
    budget_id: int = Path(..., description="ID бюджета для обновления"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    updated = await update_budget_by_id(db, budget_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Бюджет не найден")
    return updated


@router.delete(
    "/{budget_id}",
    summary="Удаление бюджета",
    description="""
    Удаляет бюджет по ID. 

    Требуется авторизация администратора.
    """
)
async def delete_budget_endpoint(
    budget_id: int = Path(..., description="ID бюджета для удаления"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    await delete_budget_by_id(db, budget_id)
    return {"detail": f"Бюджет с ID={budget_id} удалён"}