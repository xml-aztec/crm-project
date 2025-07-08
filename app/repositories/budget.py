from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.budget import Budget
from fastapi import HTTPException
from typing import List, Optional

async def get_budgets(
    db: AsyncSession,
    month: Optional[str] = None
) -> List[Budget]:
    query = select(Budget)
    if month:
        query = query.where(Budget.month == month)
    result = await db.execute(query.order_by(Budget.month, Budget.category_id))
    return result.scalars().all()

async def create_budget(db: AsyncSession, data: dict, user_id: int) -> Budget:
    exists = await db.execute(
        select(Budget).where(
            and_(Budget.month == data["month"], Budget.category_id == data["category_id"])
        )
    )
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Бюджет по этой категории уже задан")

    new = Budget(**data, created_by=user_id)
    db.add(new)
    await db.commit()
    await db.refresh(new)
    return new

async def update_budget_by_id(db: AsyncSession, budget_id: int, data: dict) -> Optional[Budget]:
    budget = await db.get(Budget, budget_id)
    if not budget:
        return None
    for key, value in data.items():
        setattr(budget, key, value)
    await db.commit()
    await db.refresh(budget)
    return budget

async def delete_budget_by_id(db: AsyncSession, budget_id: int):
    budget = await db.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Бюджет не найден")
    await db.delete(budget)
    await db.commit()