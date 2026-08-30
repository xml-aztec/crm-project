from datetime import date, datetime
from typing import Optional

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskPriority, TaskStatus, TaskUpdate


async def create_task(db: AsyncSession, user_id: int, data: TaskCreate) -> Task:
    task = Task(user_id=user_id, **data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def get_task_by_id(db: AsyncSession, task_id: int) -> Optional[Task]:
    return await db.scalar(select(Task).where(Task.id == task_id))


async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    changes = data.model_dump(exclude_unset=True)

    reschedules = "due_at" in changes or "reminder_at" in changes
    for key, value in changes.items():
        setattr(task, key, value)

    if task.reminder_at is not None and task.reminder_at > task.due_at:
        raise ValueError("Напоминание не может быть позже срока задачи")

    # Перенос срока/напоминания должен снова "включить" ещё не наступившее
    # напоминание — иначе перетащенная на новую дату задача с уже
    # сработавшим напоминанием больше никогда не напомнит о себе.
    if reschedules:
        task.reminder_sent_at = None

    await db.commit()
    await db.refresh(task)
    return task


async def set_status(db: AsyncSession, task: Task, status: TaskStatus) -> Task:
    task.status = status
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.commit()


async def get_paginated(
    db: AsyncSession,
    *,
    user_id: Optional[int] = None,
    status: Optional[TaskStatus] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    customer_id: Optional[int] = None,
    order_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Task], int, int]:
    filters = []
    if user_id is not None:
        filters.append(Task.user_id == user_id)
    if status is not None:
        filters.append(Task.status == status)
    if date_from is not None:
        filters.append(Task.due_at >= date_from)
    if date_to is not None:
        filters.append(Task.due_at <= date_to)
    if customer_id is not None:
        filters.append(Task.customer_id == customer_id)
    if order_id is not None:
        filters.append(Task.order_id == order_id)

    query = select(Task)
    count_query = select(func.count()).select_from(Task)
    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Task.due_at.asc()).offset(offset).limit(page_size)
    )
    items = list(result.scalars().all())
    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages


async def claim_due_reminders(db: AsyncSession, now: datetime, limit: int = 50) -> list[Task]:
    """Атомарно "забирает" на обработку задачи, у которых наступило время
    напоминания и оно ещё не отправлено. UPDATE ... WHERE reminder_sent_at
    IS NULL в сочетании с FOR UPDATE SKIP LOCKED на подзапросе гарантирует,
    что два параллельных/повторных запуска (тик планировщика, наложившийся
    на ручной вызов эндпоинта) никогда не заберут одну и ту же задачу —
    это и есть идемпотентность на уровне БД, а не просто на уровне кода."""
    subquery = (
        select(Task.id)
        .where(
            Task.reminder_at.isnot(None),
            Task.reminder_at <= now,
            Task.reminder_sent_at.is_(None),
            Task.status == TaskStatus.pending,
        )
        .order_by(Task.reminder_at)
        .limit(limit)
        .with_for_update(skip_locked=True)
    )
    stmt = (
        update(Task)
        .where(Task.id.in_(subquery))
        .values(reminder_sent_at=now)
        .returning(Task)
    )
    result = await db.execute(stmt)
    await db.commit()
    return list(result.scalars().all())
