from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db, is_task_owner_or_admin
from app.models.user import User
from app.rbac.service import user_is_admin
from app.repositories import task as repo
from app.schemas.task import TaskCreate, TaskPage, TaskRead, TaskStatus, TaskStatusUpdate, TaskUpdate
from app.scheduler.jobs import process_due_reminders

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, summary="Создать задачу")
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await repo.create_task(db, current_user.id, data)


@router.get("", response_model=TaskPage, summary="Мои задачи")
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    customer_id: Optional[int] = Query(None),
    order_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None, description="Только для админа — просмотр задач другого пользователя"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    # Обычный пользователь всегда видит только свои задачи; user_id учитывается
    # только для админа — это единственная точка, где RBAC-правила проекта
    # (админ видит всё) применяются к личным задачам без превращения их в
    # общий ресурс с назначением.
    scope_user_id = current_user.id
    if user_id is not None and await user_is_admin(current_user, db):
        scope_user_id = user_id

    items, total, total_pages = await repo.get_paginated(
        db,
        user_id=scope_user_id,
        status=status_filter,
        date_from=date_from,
        date_to=date_to,
        customer_id=customer_id,
        order_id=order_id,
        page=page,
        page_size=page_size,
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@router.post("/reminders/process", summary="Служебный: обработать напоминания вручную")
async def trigger_reminder_processing(
    x_reminder_token: str = Header(..., alias="X-Reminder-Token"),
):
    if not settings.TASK_REMINDER_TOKEN or x_reminder_token != settings.TASK_REMINDER_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Неверный токен")
    return await process_due_reminders()


@router.get("/{task_id}", response_model=TaskRead, summary="Получить задачу")
async def get_task(
    task_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_task_owner_or_admin),
):
    task = await repo.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    return task


@router.patch("/{task_id}", response_model=TaskRead, summary="Изменить задачу (в т.ч. перенос срока)")
async def update_task(
    data: TaskUpdate,
    task_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_task_owner_or_admin),
):
    task = await repo.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    try:
        return await repo.update_task(db, task, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/{task_id}/status", response_model=TaskRead, summary="Изменить статус задачи")
async def update_task_status(
    data: TaskStatusUpdate,
    task_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_task_owner_or_admin),
):
    task = await repo.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    return await repo.set_status(db, task, data.status)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить задачу")
async def delete_task(
    task_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_task_owner_or_admin),
):
    task = await repo.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    await repo.delete_task(db, task)
