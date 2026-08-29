import random
import uuid

import pytest
from sqlalchemy import select

from app.models.cashflow import CashFlow
from app.models.cashflow_category import CashFlowCategory
from app.models.cashflow_type import CashFlowType
from app.models.payroll import Payroll
from app.models.user import User
from app.repositories.payroll import (
    delete_payroll_by_id,
    generate_payrolls_for_month,
    pay_salary,
    recalculate_payroll,
)

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _make_salaried_user(db_session, salary_base: int = 50_000) -> User:
    user = User(
        email=f"payroll-test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="not-a-real-hash",
        full_name="Payroll Test Employee",
        is_active=True,
        is_approved=True,
        salary_base=salary_base,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _ensure_salary_cashflow_category(db_session) -> CashFlowCategory:
    """pay_salary() требует существующую категорию денежного потока "salary" —
    типы (income/expense) сеются при старте приложения, категории — нет."""
    existing = (
        await db_session.execute(select(CashFlowCategory).where(CashFlowCategory.name == "salary"))
    ).scalar_one_or_none()
    if existing:
        return existing

    expense_type = (
        await db_session.execute(select(CashFlowType).where(CashFlowType.name == "expense"))
    ).scalar_one()
    category = CashFlowCategory(name="salary", type_id=expense_type.id)
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


# Случайный далёкий год на каждый запуск набора тестов: `generate_payrolls_for_month`
# отказывает повторной генерации за один и тот же месяц, а БД разработки общая
# и не откатывается между запусками — фиксированный месяц упал бы на втором прогоне.
_TEST_RUN_YEAR = random.randint(2200, 2999)


def _unique_month(offset: int) -> str:
    return f"{_TEST_RUN_YEAR}-{offset:02d}"


async def test_generate_payrolls_creates_base_salary_without_kpi_target(db_session):
    user = await _make_salaried_user(db_session)
    month = _unique_month(1)

    payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)

    generated = next((p for p in payrolls if p.user_id == user.id), None)
    assert generated is not None
    assert generated.base_salary == user.salary_base
    assert generated.bonus_amount == 0
    assert generated.penalty_amount == 0
    assert generated.total_paid == user.salary_base
    assert generated.kpi_percent is None
    assert generated.paid_at is None


async def test_generate_payrolls_twice_for_same_month_is_rejected(db_session):
    user = await _make_salaried_user(db_session)
    month = _unique_month(2)

    await generate_payrolls_for_month(db_session, month, creator_id=user.id)

    with pytest.raises(Exception) as exc_info:
        await generate_payrolls_for_month(db_session, month, creator_id=user.id)
    assert getattr(exc_info.value, "status_code", None) == 400


async def test_recalculate_payroll_updates_totals(db_session):
    user = await _make_salaried_user(db_session, salary_base=40_000)
    month = _unique_month(3)
    payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)
    payroll = next(p for p in payrolls if p.user_id == user.id)

    # Меняем оклад сотрудника задним числом и пересчитываем — пересчёт должен это учесть.
    user.salary_base = 45_000
    await db_session.commit()

    recalculated = await recalculate_payroll(db_session, payroll.id)
    assert recalculated.base_salary == 45_000
    assert recalculated.total_paid == 45_000


async def test_recalculate_paid_payroll_is_rejected(db_session):
    user = await _make_salaried_user(db_session)
    month = _unique_month(4)
    await _ensure_salary_cashflow_category(db_session)
    payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)
    payroll = next(p for p in payrolls if p.user_id == user.id)

    await pay_salary(db_session, payroll.id)

    with pytest.raises(Exception) as exc_info:
        await recalculate_payroll(db_session, payroll.id)
    assert getattr(exc_info.value, "status_code", None) == 400


async def test_pay_salary_marks_paid_and_creates_cashflow_entry(db_session):
    user = await _make_salaried_user(db_session, salary_base=60_000)
    month = _unique_month(5)
    await _ensure_salary_cashflow_category(db_session)
    payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)
    payroll = next(p for p in payrolls if p.user_id == user.id)

    result = await pay_salary(db_session, payroll.id)
    assert result["status"] == "ok"
    assert result["paid"] == 60_000

    await db_session.refresh(payroll)
    assert payroll.paid_at is not None

    cash_entry = (
        await db_session.execute(
            select(CashFlow).where(CashFlow.source == "payroll", CashFlow.entity_id == payroll.id)
        )
    ).scalar_one_or_none()
    assert cash_entry is not None
    assert cash_entry.amount == 60_000


async def test_pay_salary_twice_is_rejected(db_session):
    user = await _make_salaried_user(db_session)
    month = _unique_month(6)
    await _ensure_salary_cashflow_category(db_session)
    payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)
    payroll = next(p for p in payrolls if p.user_id == user.id)

    await pay_salary(db_session, payroll.id)

    with pytest.raises(Exception) as exc_info:
        await pay_salary(db_session, payroll.id)
    assert getattr(exc_info.value, "status_code", None) == 400


async def test_delete_paid_payroll_is_rejected(db_session):
    user = await _make_salaried_user(db_session)
    month = _unique_month(7)
    await _ensure_salary_cashflow_category(db_session)
    payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)
    payroll = next(p for p in payrolls if p.user_id == user.id)

    await pay_salary(db_session, payroll.id)

    with pytest.raises(Exception) as exc_info:
        await delete_payroll_by_id(db_session, payroll.id)
    assert getattr(exc_info.value, "status_code", None) == 400


async def test_delete_unpaid_payroll_succeeds(db_session):
    user = await _make_salaried_user(db_session)
    month = _unique_month(8)
    payrolls = await generate_payrolls_for_month(db_session, month, creator_id=user.id)
    payroll = next(p for p in payrolls if p.user_id == user.id)

    await delete_payroll_by_id(db_session, payroll.id)

    remaining = await db_session.get(Payroll, payroll.id)
    assert remaining is None
