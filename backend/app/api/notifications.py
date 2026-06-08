from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.repositories import notification as repo
from app.schemas.notification import NotificationOut, UnreadCountOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


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
