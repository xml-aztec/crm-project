from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.cashflow import CashFlow
from app.models.cashflow_category import CashFlowCategory
from app.models.cashflow_type import CashFlowType
from app.models.payroll import Payroll
from datetime import date, datetime
from fastapi import HTTPException


async def get_cash_flows(
    db: AsyncSession,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    type_name: Optional[str] = None,
    category_name: Optional[str] = None,
) -> List[CashFlow]:
    query = select(CashFlow).join(CashFlow.type).outerjoin(CashFlow.category)

    if from_date:
        query = query.where(CashFlow.date >= from_date)
    if to_date:
        query = query.where(CashFlow.date <= to_date)

    if type_name:
        query = query.where(CashFlowType.name == type_name)

    if category_name:
        query = query.where(CashFlowCategory.name == category_name)

    query = query.order_by(CashFlow.date.desc(), CashFlow.id.desc())

    result = await db.execute(query)
    return result.scalars().all()


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
        raise HTTPException(status_code=400, detail="Уже выплачена")

    payroll.paid_at = datetime.utcnow()

    type_id = await get_cashflow_type_id(db, "expense")
    category_id = await get_cashflow_category_id(db, "salary")

    cash = CashFlow(
        date=datetime.utcnow().date(),
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