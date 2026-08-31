import asyncio
from fastapi import APIRouter, Depends, Query, Response
from typing import Optional, List
from datetime import date
from app.core.dependencies import get_db
from app.rbac.dependencies import require_permission
from app.models.user import User
from app.schemas.cashflow import CashFlowOut
from app.repositories.cashflow import get_cash_flows
from app.utils.pdf import render_cashflow_pdf

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

    Требуется право cashflow.read.
    """
)
async def list_cash_flows(
    from_date: Optional[date] = Query(None, description="Начальная дата (в формате YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Конечная дата (в формате YYYY-MM-DD)"),
    type_name: Optional[str] = Query(None, description="Тип движения: 'income' или 'expense'"),
    category_name: Optional[str] = Query(None, description="Название категории: 'salary', 'order_payment' и т.д."),
    db: Depends = Depends(get_db),
    current_user: User = Depends(require_permission("cashflow.read")),
):
    return await get_cash_flows(
        db,
        from_date=from_date,
        to_date=to_date,
        type_name=type_name,
        category_name=category_name,
    )


@router.get(
    "/export-pdf",
    summary="Экспорт денежных потоков в PDF",
    description="PDF за тот же период и с теми же фильтрами, что и экранный список /cash-flows/. Требуется право cashflow.read."
)
async def export_cash_flows_pdf(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    type_name: Optional[str] = Query(None),
    category_name: Optional[str] = Query(None),
    db: Depends = Depends(get_db),
    current_user: User = Depends(require_permission("cashflow.read")),
):
    entries = await get_cash_flows(
        db,
        from_date=from_date,
        to_date=to_date,
        type_name=type_name,
        category_name=category_name,
    )
    # pdfkit шеллится в wkhtmltopdf и блокирует поток — уводим в отдельный
    # поток, чтобы не держать event loop на время рендера.
    pdf_bytes = await asyncio.to_thread(render_cashflow_pdf, entries, from_date, to_date, type_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cashflow_report.pdf"},
    )