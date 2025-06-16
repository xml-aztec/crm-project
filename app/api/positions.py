from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.core.dependencies import is_admin
from app.models.user import User
from app.schemas.position import PositionBase, PositionRead, PositionCreate
from app.repositories import position as repo

router = APIRouter(prefix="/positions", tags=["Positions"])

@router.get(
    "/",
    response_model=list[PositionRead],
    summary="Список должностей",
    description="Возвращает список всех должностей, доступных в системе."
)
async def list_positions(db: AsyncSession = Depends(get_db)):
    return await repo.get_positions(db)

@router.post(
    "/",
    response_model=PositionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать должность",
    description="Создаёт новую должность. Только для администраторов."
)
async def create_position(
    position_data: PositionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    return await repo.create_position(db, position_data.name)


@router.patch(
    "/{id}",
    response_model=PositionRead,
    summary="Обновить должность",
    description="Обновляет название должности по ID. Доступно только администратору."
)
async def update_position(
    id: int,
    data: PositionBase,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    updated = await repo.update(db, id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Должность не найдена")
    return updated

@router.delete(
    "/{position_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить должность",
    description="Удаляет должность по ID. Только для администраторов."
)
async def delete_position(
    position_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    deleted = await repo.delete_position(db, position_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Position not found")