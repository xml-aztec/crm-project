from fastapi import APIRouter, Depends, Query, Path
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, is_admin
from app.models.user import User
from app.schemas.payroll import PayrollOut
from app.repositories.payroll import (
    generate_payrolls_for_month,
    get_payrolls,
    pay_salary,
)

router = APIRouter(prefix="/payrolls", tags=["Payrolls"])


@router.get(
    "/",
    response_model=List[PayrollOut],
    summary="Список начисленных зарплат",
    description="""
    Возвращает список всех начисленных зарплат.

    Фильтрация:
    - по месяцу (`month`, формат `YYYY-MM`)
    - по статусу выплаты (`only_paid`)
    - по конкретному сотруднику (`user_id`)

    Требуется авторизация администратора.
"""
)
async def list_payrolls(
    month: Optional[str] = Query(None, example="2025-07", description="Месяц начисления зарплаты в формате YYYY-MM"),
    only_paid: Optional[bool] = Query(None, description="Показывать только выплаченные (`true`) или не выплаченные (`false`) зарплаты"),
    user_id: Optional[int] = Query(None, description="Фильтрация по ID сотрудника"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(is_admin),
):
    return await get_payrolls(db, month=month, only_paid=only_paid, user_id=user_id)


@router.post(
    "/generate/",
    response_model=List[PayrollOut],
    summary="Генерация ведомости зарплат",
    description="""
    Создаёт записи начислений зарплат за указанный месяц для всех активных сотрудников с установленной базовой ставкой.

    Автоматически рассчитываются:
    - базовая ставка
    - премия (пока 0)
    - штраф (пока 0)
    - итоговая сумма

    Требуется авторизация администратора.
"""
)
async def generate_payrolls(
    month: str = Query(..., example="2025-07", description="Месяц начисления зарплаты в формате YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(is_admin)
):
    return await generate_payrolls_for_month(db, month, creator_id=user.id)


@router.post(
    "/{payroll_id}/pay",
    summary="Выплата зарплаты",
    description="""
    Отмечает зарплату как выплаченную (устанавливает `paid_at`) и создаёт соответствующую запись в таблице `CashFlow`.

    - Если зарплата уже выплачена — возвращается ошибка
    - Тип расхода: `expense`
    - Категория: `salary`
    - Источник: `payroll`

    Требуется авторизация администратора.
    """
)
async def pay_salary_endpoint(
    payroll_id: int = Path(..., description="ID записи о зарплате"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(is_admin),
):
    return await pay_salary(db, payroll_id)