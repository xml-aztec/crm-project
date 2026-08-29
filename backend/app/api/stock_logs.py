from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from app.core.dependencies import get_db, get_current_user
from app.rbac.dependencies import require_permission
from app.models.user import User
from app.schemas.stock_log import StockLogOut, StockLogPage
from app.repositories.stock_log import get_stock_logs, get_stock_logs_paginated

router = APIRouter(prefix="/stock/logs", tags=["Stock Logs"])

@router.get(
    "/paginated",
    response_model=StockLogPage,
    summary="Логи движения товаров с пагинацией",
)
async def list_stock_logs_paginated(
    product_id: Optional[int] = Query(None, description="Фильтрация по ID товара"),
    warehouse_id: Optional[int] = Query(None, description="Фильтрация по ID склада"),
    order_id: Optional[int] = Query(None, description="Фильтрация по ID заказа"),
    type: Optional[str] = Query(None, description="Тип движения: incoming, outgoing, return, adjust"),
    date_from: Optional[datetime] = Query(None, description="Дата от (формат ISO)"),
    date_to: Optional[datetime] = Query(None, description="Дата до (формат ISO)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    __: User = Depends(require_permission("stock.read")),
):
    items, total, total_pages = await get_stock_logs_paginated(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        order_id=order_id,
        type=type,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    return StockLogPage(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)

@router.get("/", response_model=List[StockLogOut], summary="Логи движения товаров")
async def list_stock_logs(
    product_id: Optional[int] = Query(None, description="Фильтрация по ID товара"),
    warehouse_id: Optional[int] = Query(None, description="Фильтрация по ID склада"),
    order_id: Optional[int] = Query(None, description="Фильтрация по ID заказа"),
    type: Optional[str] = Query(None, description="Тип движения: incoming, outgoing, return, adjust"),
    date_from: Optional[datetime] = Query(None, description="Дата от (формат ISO)"),
    date_to: Optional[datetime] = Query(None, description="Дата до (формат ISO)"),
    skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
    limit: int = Query(20, ge=1, le=1000, description="Сколько записей вернуть"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    __: User = Depends(require_permission("stock.read")),
):
    return await get_stock_logs(
        db=db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        order_id=order_id,
        type=type,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit
    )