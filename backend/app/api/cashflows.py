from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from datetime import date
from app.core.dependencies import get_db, is_admin
from app.models.user import User
from app.schemas.cashflow import CashFlowOut
from app.repositories.cashflow import get_cash_flows

router = APIRouter(prefix="/cash-flows", tags=["CashFlow"])


@router.get(
    "/",
    response_model=List[CashFlowOut],
    summary="Список денежных потоков",
    description="""
    Возвращает список операций движения денежных средств (CashFlow).

    Можно фильтровать по:
    - дате (от и до)
    - типу движения (`income` или `expense`)
    - категории (например, `salary`, `order_payment`, `supply_payment`)

    Требуется авторизация администратора.
    """
)
async def list_cash_flows(
    from_date: Optional[date] = Query(None, description="Начальная дата (в формате YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Конечная дата (в формате YYYY-MM-DD)"),
    type_name: Optional[str] = Query(None, description="Тип движения: 'income' или 'expense'"),
    category_name: Optional[str] = Query(None, description="Название категории: 'salary', 'order_payment' и т.д."),
    db: Depends = Depends(get_db),
    current_user: User = Depends(is_admin),
):
    return await get_cash_flows(
        db,
        from_date=from_date,
        to_date=to_date,
        type_name=type_name,
        category_name=category_name,
    )