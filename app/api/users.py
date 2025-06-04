from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import SessionLocal
from app.repositories import user as user_repo
from app.schemas.user import UserOut, UserRead, UserUpdate
from app.core.dependencies import get_current_user, is_admin
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.get(
    "/", 
    response_model=List[UserOut], 
    summary="Список всех пользователей",
    description="Возвращает список всех пользователей, прошедших модерацию."
)
async def list_users(db: AsyncSession = Depends(get_db)):
    return await user_repo.get_users(db)

@router.patch("/{user_id}", response_model=UserRead, summary="Обновить пользователя")
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    user = await user_repo.update_user(db, user_id, data.model_dump(exclude_unset=True))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete(
    "/{user_id}", 
    summary="Удаление подтверждённого пользователя",
    description="Удаляет пользователя из базы данных по его ID. Только для подтверждённых пользователей."
)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    await db.delete(user)
    await db.commit()

    return {"detail": f"Пользователь с ID {user_id} успешно удалён"}

@router.get(
    "/pending", 
    response_model=List[UserRead], 
    summary="Ожидающие подтверждения пользователи",
    description="Возвращает список пользователей, ожидающих модерации. Только для администраторов."
)
async def get_pending_users(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(is_admin)
):
    return await user_repo.list_pending_users(db)

@router.put(
    "/{user_id}/approve", 
    response_model=UserRead, 
    summary="Подтверждение пользователя",
    description="Одобряет регистрацию пользователя и делает его активным. Только для администраторов."
)
async def approve_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await user_repo.approve_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete(
    "/pending/{user_id}", 
    summary="Отклонение заявки пользователя",
    description="Удаляет пользователя, который не прошёл модерацию. Только для администраторов."
)
async def reject_user(
    user_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(is_admin)
):
    await user_repo.delete_user(db, user_id)
    return {"detail": f"Заявка пользователя с ID {user_id} отклонена и удалена"}
