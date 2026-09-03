from typing import Optional, List
from sqlalchemy import select, delete, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.user import User
from app.models.payroll import Payroll
from app.models.cashflow import CashFlow
from app.models.cashflow_type import CashFlowType
from app.models.cashflow_category import CashFlowCategory
from app.models.kpi_rule import KpiRule
from app.models.monthly_target import MonthlyTarget
from app.models.order import Order
from app.repositories.monthly_target import get_manager_kpi
from app.utils.orders import order_counts_as_revenue


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


async def get_actual_sales(db: AsyncSession, manager_id: int, month: str) -> float:
    year, month_num = map(int, month.split("-"))
    start = datetime(year, month_num, 1, tzinfo=timezone.utc)
    if month_num == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month_num + 1, 1, tzinfo=timezone.utc)

    result = await db.execute(
        select(func.sum(Order.finalized_total_price))
        .where(
            and_(
                Order.user_id == manager_id,
                order_counts_as_revenue(),
                Order.confirmed_at >= start,
                Order.confirmed_at < end
            )
        )
    )
    return float(result.scalar() or 0.0)


async def get_matching_kpi_rule(db: AsyncSession, percent: float) -> Optional[KpiRule]:
    result = await db.execute(
        select(KpiRule).where(KpiRule.min_percent <= percent).order_by(KpiRule.min_percent.desc())
    )
    return result.scalars().first()


async def generate_payrolls_for_month(db: AsyncSession, month: str, creator_id: int) -> List[Payroll]:
    existing = await db.execute(select(Payroll).where(Payroll.month == month))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail=f"Зарплаты за {month} уже были сгенерированы")

    result = await db.execute(
        select(User).where(User.is_active == True, User.salary_base > 0)
    )
    users = result.scalars().all()

    payrolls = []

    for user in users:
        base = user.salary_base
        bonus = 0
        penalty = 0
        kpi_percent = None
        kpi_rule_id = None

        target_obj = await get_manager_kpi(db, user.id, month)
        if target_obj:
            target = target_obj.target_amount
            actual = await get_actual_sales(db, user.id, month)
            if target > 0:
                kpi_percent = round((actual / target) * 100, 2)
                rule = await get_matching_kpi_rule(db, kpi_percent)
                if rule:
                    kpi_rule_id = rule.id
                    # Бонус и штраф считаются НЕЗАВИСИМО (было `if ... elif`,
                    # из-за чего у правила с заполненным бонусом штраф был
                    # недостижим в принципе). По бизнес-смыслу ступень KPI —
                    # либо поощрительная, либо штрафная, и схема теперь это
                    # прямо запрещает (см. KpiRuleBase), но на уже
                    # существующих строках с обоими полями поведение должно
                    # быть предсказуемым, а не молча терять штраф.
                    #
                    # `or 0` обязателен: обе колонки nullable, и правило,
                    # созданное только со штрафом, роняло генерацию зарплат
                    # целиком — `None > 0` бросает TypeError.
                    rule_bonus = rule.bonus or 0
                    rule_penalty = rule.penalty or 0
                    if rule_bonus > 0:
                        bonus = int(base * rule_bonus / 100)
                    if rule_penalty > 0:
                        penalty = int(base * rule_penalty / 100)

        total = base + bonus - penalty

        payroll = Payroll(
            user_id=user.id,
            month=month,
            base_salary=base,
            bonus_amount=bonus,
            penalty_amount=penalty,
            total_paid=total,
            created_by=creator_id,
            kpi_percent=kpi_percent,
            kpi_rule_id=kpi_rule_id
        )
        payrolls.append(payroll)

    db.add_all(payrolls)
    await db.commit()
    return payrolls


async def recalculate_payroll(db: AsyncSession, payroll_id: int) -> Payroll:
    payroll = await db.get(Payroll, payroll_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Запись о зарплате не найдена")

    if payroll.paid_at:
        raise HTTPException(status_code=400, detail="Нельзя пересчитать уже выплаченную зарплату")

    user = await db.get(User, payroll.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")

    target_obj = await get_manager_kpi(db, user.id, payroll.month)
    base = user.salary_base
    bonus = 0
    penalty = 0
    kpi_percent = None
    kpi_rule_id = None

    if target_obj:
        target = target_obj.target_amount
        actual = await get_actual_sales(db, user.id, payroll.month)
        if target > 0:
            kpi_percent = round((actual / target) * 100, 2)
            rule = await get_matching_kpi_rule(db, kpi_percent)
            if rule:
                kpi_rule_id = rule.id
                if rule.bonus > 0:
                    bonus = int(base * rule.bonus / 100)
                elif rule.penalty > 0:
                    penalty = int(base * rule.penalty / 100)

    payroll.base_salary = base
    payroll.bonus_amount = bonus
    payroll.penalty_amount = penalty
    payroll.kpi_percent = kpi_percent
    payroll.kpi_rule_id = kpi_rule_id
    payroll.total_paid = base + bonus - penalty

    await db.commit()
    await db.refresh(payroll)
    return payroll


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


async def update_payroll_by_id(db: AsyncSession, payroll_id: int, data: dict) -> Optional[Payroll]:
    payroll = await db.get(Payroll, payroll_id)
    if not payroll:
        return None

    for key, value in data.items():
        setattr(payroll, key, value)

    base = data.get("base_salary", payroll.base_salary)
    bonus = data.get("bonus_amount", payroll.bonus_amount)
    penalty = data.get("penalty_amount", payroll.penalty_amount)
    payroll.total_paid = base + bonus - penalty

    await db.commit()
    await db.refresh(payroll)
    return payroll


async def delete_payroll_by_id(db: AsyncSession, payroll_id: int) -> None:
    payroll = await db.get(Payroll, payroll_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Зарплата не найдена")
    if payroll.paid_at:
        raise HTTPException(status_code=400, detail="Нельзя удалить уже выплаченную зарплату")

    await db.delete(payroll)
    await db.commit()