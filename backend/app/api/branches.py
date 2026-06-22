from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.branch import BranchCreate, BranchRead, BranchUpdate
from app.repositories import branch as repo
from app.core.dependencies import get_current_user, get_db, is_admin

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.get(
    "/",
    response_model=List[BranchRead],
    dependencies=[Depends(get_current_user)],
    summary="Получить список всех филиалов",
    description="Возвращает список всех филиалов компании."
)
async def get_all_branches(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)


@router.get(
    "/{branch_id}",
    response_model=BranchRead,
    dependencies=[Depends(get_current_user)],
    summary="Получить филиал по ID",
    description="Возвращает информацию о конкретном филиале по его идентификатору.",
    responses={404: {"description": "Филиал не найден"}}
)
async def get_branch(branch_id: int, db: AsyncSession = Depends(get_db)):
    branch = await repo.get_by_id(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Филиал не найден")
    return branch


@router.post(
    "/",
    response_model=BranchRead,
    dependencies=[Depends(is_admin)],
    summary="Создать новый филиал",
    description="Создаёт новый филиал. Доступно только администраторам."
)
async def create_branch(data: BranchCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data)


@router.patch(
    "/{branch_id}",
    response_model=BranchRead,
    dependencies=[Depends(is_admin)],
    summary="Обновить филиал",
    description="Обновляет данные филиала по его ID. Доступно только администраторам.",
    responses={404: {"description": "Филиал не найден"}}
)
async def update_branch(branch_id: int, data: BranchUpdate, db: AsyncSession = Depends(get_db)):
    branch = await repo.update(db, branch_id, data)
    if not branch:
        raise HTTPException(status_code=404, detail="Филиал не найден")
    return branch


@router.delete(
    "/{branch_id}",
    status_code=204,
    dependencies=[Depends(is_admin)],
    summary="Удалить филиал",
    description="Удаляет филиал по его ID. Доступно только администраторам.",
    responses={404: {"description": "Филиал не найден"}, 204: {"description": "Успешное удаление"}}
)
async def delete_branch(branch_id: int, db: AsyncSession = Depends(get_db)):
    await repo.delete(db, branch_id)