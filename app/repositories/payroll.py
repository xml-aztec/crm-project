from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.user import User
from app.models.payroll import Payroll
from app.models.cashflow import CashFlow
from app.models.cashflow_type import CashFlowType
from app.models.cashflow_category import CashFlowCategory


async def get_payrolls(
    db: AsyncSession,
    month: Optional[str] = None,
    only_paid: Optional[bool] = None,
    user_id: Optional[int] = None
) -> List[Payroll]:
    query = select(Payroll)

    if month:
        query = query.where(Payroll.month == month)

    if only_paid is not None:
        if only_paid:
            query = query.where(Payroll.paid_at.isnot(None))
        else:
            query = query.where(Payroll.paid_at.is_(None))

    if user_id:
        query = query.where(Payroll.user_id == user_id)

    result = await db.execute(query.order_by(Payroll.month.desc(), Payroll.user_id))
    return result.scalars().all()


async def generate_payrolls_for_month(db: AsyncSession, month: str, creator_id: int) -> List[Payroll]:
    result = await db.execute(
        select(User).where(User.is_active == True, User.salary_base > 0)
    )
    users = result.scalars().all()

    payrolls = []

    for user in users:
        base = user.salary_base
        bonus = 0  # Заглушка, можно связать с KPI
        penalty = 0  # Заглушка, можно потом добавить
        total = base + bonus - penalty

        payroll = Payroll(
            user_id=user.id,
            month=month,
            base_salary=base,
            bonus_amount=bonus,
            penalty_amount=penalty,
            total_paid=total,
            created_by=creator_id,
        )
        payrolls.append(payroll)

    db.add_all(payrolls)
    await db.commit()
    return payrolls


async def get_cashflow_type_id(db: AsyncSession, name: str) -> int:
    result = await db.execute(select(CashFlowType).where(CashFlowType.name == name))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=400, detail=f"Тип CashFlow '{name}' не найден")
    return obj.id


async def get_cashflow_category_id(db: AsyncSession, name: str) -> int:
    result = await db.execute(select(CashFlowCategory).where(CashFlowCategory.name == name))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=400, detail=f"Категория CashFlow '{name}' не найдена")
    return obj.id


async def pay_salary(db: AsyncSession, payroll_id: int):
    payroll = await db.get(Payroll, payroll_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Зарплата не найдена")
    if payroll.paid_at:
        raise HTTPException(status_code=400, detail="Зарплата уже выплачена")

    payroll.paid_at = datetime.now(timezone.utc)

    type_id = await get_cashflow_type_id(db, "expense")
    category_id = await get_cashflow_category_id(db, "salary")

    cash = CashFlow(
        date=datetime.now(timezone.utc),
        amount=payroll.total_paid,
        type_id=type_id,
        category_id=category_id,
        source="payroll",
        entity_id=payroll.id,
        description=f"Выплата ЗП сотруднику user_id={payroll.user_id}"
    )

    db.add(cash)
    await db.commit()

    return {"status": "ok", "paid": payroll.total_paid}