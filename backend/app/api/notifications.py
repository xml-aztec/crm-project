from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.repositories import notification as repo
from app.repositories import notification_preference as pref_repo
from app.schemas.notification import NotificationOut, NotificationPage, UnreadCountOut
from app.schemas.notification_preference import NotificationPreferenceOut, NotificationPreferenceUpdate

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/paginated", response_model=NotificationPage, summary="Мои уведомления (с пагинацией)")
async def get_notifications_paginated(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    items, total, total_pages = await repo.get_paginated(db, current_user.id, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@router.get(
    "/preferences", response_model=List[NotificationPreferenceOut], summary="Мои настройки уведомлений"
)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await pref_repo.get_effective_preferences(db, current_user.id)


@router.put(
    "/preferences", response_model=List[NotificationPreferenceOut], summary="Обновить настройки уведомлений"
)
async def update_notification_preferences(
    updates: List[NotificationPreferenceUpdate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for update in updates:
        try:
            await pref_repo.upsert_preference(
                db, current_user.id, update.notification_type_code, update.channel, update.enabled
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return await pref_repo.get_effective_preferences(db, current_user.id)


@router.get("", response_model=List[NotificationOut], summary="Мои уведомления")
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await repo.get_user_notifications(db, current_user.id)


@router.get("/unread-count", response_model=UnreadCountOut, summary="Количество непрочитанных")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = await repo.get_unread_count(db, current_user.id)
    return {"count": count}


@router.patch("/{notification_id}/read", response_model=NotificationOut, summary="Отметить как прочитанное")
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = await repo.mark_read(db, notification_id, current_user.id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")
    return notif


@router.patch("/read-all", status_code=status.HTTP_204_NO_CONTENT, summary="Отметить все как прочитанные")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await repo.mark_all_read(db, current_user.id)
