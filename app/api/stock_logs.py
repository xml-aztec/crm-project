from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from app.core.dependencies import get_db, is_admin
from app.models.user import User
from app.schemas.stock_log import StockLogOut
from app.repositories.stock_log import get_stock_logs

router = APIRouter(prefix="/stock/logs", tags=["Stock Logs"])

@router.get("/", response_model=List[StockLogOut], summary="Логи движения товаров")
async def list_stock_logs(
    product_id: Optional[int] = Query(None, description="Фильтрация по ID товара"),
    warehouse_id: Optional[int] = Query(None, description="Фильтрация по ID склада"),
    type: Optional[str] = Query(None, description="Тип движения: incoming, outgoing, return, adjust"),
    date_from: Optional[datetime] = Query(None, description="Дата от (формат ISO)"),
    date_to: Optional[datetime] = Query(None, description="Дата до (формат ISO)"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await get_stock_logs(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        type=type,
        date_from=date_from,
        date_to=date_to
    )