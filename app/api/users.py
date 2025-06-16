from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import SessionLocal
from app.repositories import user as user_repo
from app.schemas.user import (
    UserOut,
    UserRead,
    UserUpdate,
    UserUpdateAdmin,
    UserUpdateSelf
)
from app.core.dependencies import get_current_user, is_admin
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])


async def get_db():
    async with SessionLocal() as session:
        yield session


@router.get(
    "/pending",
    response_model=List[UserRead],
    summary="Ожидающие подтверждения пользователи",
    description="Возвращает список пользователей, ожидающих модерации. Только для администраторов."
)
async def get_pending_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await user_repo.list_pending_users(db)


@router.get(
    "/",
    response_model=List[UserOut],
    summary="Список всех пользователей",
    description="Возвращает список всех пользователей, прошедших модерацию."
)
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await user_repo.get_users(db)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Получить собственный профиль",
    description="Возвращает данные текущего авторизованного пользователя."
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.get(
    "/me/stats",
    summary="Моя статистика по заказам",
    description="Возвращает детализированную статистику заказов текущего пользователя (менеджера)."
)
async def get_my_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = await user_repo.get_detailed_user_stats(db, current_user.id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Статистика не найдена")
    return stats


@router.get("/{user_id}", response_model=UserOut, summary="Профиль пользователя (только для админов)")
async def get_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    user = await user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.get(
    "/{user_id}/stats",
    summary="Статистика сотрудника",
    description="Возвращает статистику по заказам указанного сотрудника."
)
async def get_user_statistics(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    stats = await user_repo.get_detailed_user_stats(db, user_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return stats


@router.patch(
    "/{user_id}/admin",
    response_model=UserRead,
    summary="Обновление пользователя (админ)",
    description="Позволяет администратору изменить данные другого пользователя: имя, email, телефон, роль, должность, активность."
)
async def update_user_admin(
    user_id: int,
    data: UserUpdateAdmin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(is_admin),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя менять самому себе роль, статус или должность через этот эндпоинт. Используйте /users/me."
        )

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    updated = await user_repo.update_user_admin(db, user_id, data)
    return updated


@router.patch(
    "/me",
    response_model=UserRead,
    summary="Обновление собственного профиля",
    description="Позволяет пользователю изменить только свои контактные данные: имя, email, телефон. "
                "Изменение роли и должности невозможно."
)
async def update_user_self(
    data: UserUpdateSelf,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = await user_repo.update_user_self(db, current_user.id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return updated


@router.delete(
    "/{user_id}",
    summary="Удаление пользователя",
    description="Удаляет пользователя из базы данных по его ID. Только для администраторов."
)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(is_admin)
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить собственную учётную запись."
        )

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    await db.delete(target)
    await db.commit()
    return {"detail": f"Пользователь с ID {user_id} успешно удалён"}


@router.put(
    "/{user_id}/approve",
    response_model=UserRead,
    summary="Подтверждение пользователя",
    description="Одобряет регистрацию пользователя и делает его активным. Только для администраторов."
)
async def approve_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    
):
    user = await user_repo.approve_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return user


@router.delete(
    "/pending/{user_id}",
    summary="Отклонение заявки пользователя",
    description="Удаляет пользователя, который не прошёл модерацию. Только для администраторов."
)
async def reject_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    await user_repo.delete_user(db, user_id)
    return {"detail": f"Заявка пользователя с ID {user_id} отклонена и удалена"}