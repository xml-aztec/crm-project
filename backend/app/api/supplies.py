from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.core.dependencies import get_current_user, get_db, is_admin
from app.models.user import User
from app.schemas.supply import SupplyCreate, SupplyUpdate, SupplyOut, SupplyListResponse
from app.repositories import supply as repo
from app.utils.pdf import render_supply_pdf

router = APIRouter(prefix="/supplies", tags=["Supplies"])

@router.post(
    "/",
    response_model=SupplyOut,
    summary="Создать поставку",
    description="Создаёт новую поставку и обновляет остатки на складе. Доступно только администратору.",
    dependencies=[Depends(is_admin)]
)
async def create_supply(
    data: SupplyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await repo.create_supply(db, data, created_by=current_user.id)

@router.get(
    "/",
    response_model=SupplyListResponse,
    summary="Список поставок с пагинацией",
    description="Получить список всех поставок с фильтрами, пагинацией и общим количеством записей.",
    dependencies=[Depends(get_current_user)]
)
async def list_supplies(
    warehouse_id: Optional[int] = Query(None, description="Фильтр по складу"),
    supplier_id: Optional[int] = Query(None, description="Фильтр по ID поставщика"),
    date_from: Optional[date] = Query(None, description="Начальная дата поставки"),
    date_to: Optional[date] = Query(None, description="Конечная дата поставки"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    supplies, total = await repo.get_all_supplies(
        db,
        warehouse_id=warehouse_id,
        supplier_id=supplier_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset
    )
    return SupplyListResponse(total=total, items=supplies)

@router.get(
    "/{supply_id}",
    response_model=SupplyOut,
    summary="Получить поставку по ID",
    description="Получить подробную информацию о конкретной поставке и её позициях.",
    dependencies=[Depends(get_current_user)]
)
async def get_supply(supply_id: int, db: AsyncSession = Depends(get_db)):
    supply = await repo.get_supply_by_id(db, supply_id)
    if not supply:
        raise HTTPException(status_code=404, detail="Поставка не найдена")
    return supply

@router.get(
    "/{supply_id}/pdf",
    summary="Скачать PDF поставки",
    description="Генерация PDF-документа поставки.",
    response_class=Response,
    dependencies=[Depends(get_current_user)]
)
async def download_supply_pdf(supply_id: int, db: AsyncSession = Depends(get_db)):
    supply = await repo.get_supply_by_id(db, supply_id)
    if not supply:
        raise HTTPException(status_code=404, detail="Поставка не найдена")

    pdf_bytes = render_supply_pdf(SupplyOut.model_validate(supply))
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=supply_{supply_id}.pdf"
    })

@router.patch(
    "/{supply_id}",
    response_model=SupplyOut,
    summary="Обновить поставку",
    description="Редактирует поставку и корректирует остатки на складе. Доступно только администратору.",
    dependencies=[Depends(is_admin)]
)
async def update_supply(
    supply_id: int,
    data: SupplyUpdate,
    db: AsyncSession = Depends(get_db)
):
    return await repo.update_supply(db, supply_id, data)

@router.delete(
    "/{supply_id}",
    status_code=204,
    summary="Удалить поставку",
    description="Удаляет поставку и корректирует остатки. Доступно только администратору.",
    dependencies=[Depends(is_admin)]
)
async def delete_supply(supply_id: int, db: AsyncSession = Depends(get_db)):
    await repo.delete_supply(db, supply_id)