from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.repositories import user as user_repo
from app.schemas.user import (
    UserDetailedStats,
    UserOut,
    UserRead,
    UserStatsOut,
    UserUpdate,
    UserUpdateAdmin,
    UserUpdateSelf,
    PasswordChange,
)
from app.core.dependencies import get_current_user, get_db, is_admin, is_self_or_admin
from app.models.user import User
from app.utils.email import send_approval_email
from app.repositories import notification as notif_repo
from app.rbac.service import user_is_admin, get_user_permissions

router = APIRouter(prefix="/users", tags=["Users"])


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
    _: User = Depends(is_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await user_repo.get_users(db, skip=skip, limit=limit)


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
    response_model=UserStatsOut,
    summary="Моя статистика по заказам",
    description="Возвращает статистику заказов за указанный месяц (по умолчанию текущий)."
)
async def get_my_statistics(
    year: Optional[int] = Query(None, description="Год статистики (по умолчанию текущий)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Месяц статистики (по умолчанию текущий)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = await user_repo.get_user_stats(db, current_user.id, year, month)
    if stats is None:
        raise HTTPException(status_code=404, detail="Статистика не найдена")
    return stats


@router.get(
    "/me/permissions",
    response_model=List[str],
    summary="Мои права доступа",
    description="Флэт-список кодов прав (resource.action) текущего пользователя — используется фронтендом для показа/скрытия разделов."
)
async def get_my_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return sorted(await get_user_permissions(current_user.id, db))


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
    description="Возвращает статистику по заказам указанного сотрудника за указанный месяц. По умолчанию — текущий месяц. Доступно администраторам и самому пользователю."
)
async def get_user_statistics(
    user_id: int,
    year: Optional[int] = Query(None, description="Год (например, 2025)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Месяц (1-12)"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_self_or_admin)
):
    stats = await user_repo.get_detailed_user_stats(db, user_id, year=year, month=month)
    if stats is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return stats


@router.patch(
    "/{user_id}/admin",
    response_model=UserRead,
    summary="Обновление пользователя (админ)",
    description="Позволяет администратору изменить данные другого пользователя: имя, email, телефон, роль, должность, активность, ставка зарплаты."
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

    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    if await user_is_admin(target, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя изменять данные другого администратора."
        )

    updated = await user_repo.update_user_admin(db, user_id, data)
    return updated


@router.patch(
    "/me/password",
    status_code=200,
    summary="Смена пароля",
    description="Текущий пользователь меняет свой пароль. Требуется текущий пароль для подтверждения."
)
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core import security as sec
    if not sec.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль"
        )
    await user_repo.update_password(db, current_user.id, data.new_password)
    return {"message": "Пароль успешно изменён"}


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

    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    if await user_is_admin(target, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя удалить учётную запись администратора."
        )

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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    user = await user_repo.approve_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    await send_approval_email(background_tasks, user.email, user.full_name)
    await notif_repo.create_notification(
        db,
        user_id=user.id,
        title="Аккаунт одобрен",
        message="Ваша заявка на регистрацию одобрена. Добро пожаловать!",
        type="user",
        entity_id=user.id,
    )
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