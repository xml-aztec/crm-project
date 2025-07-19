from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.core.dependencies import is_admin
from app.schemas.monthly_target import MonthlyTargetCreate, MonthlyTargetOut
from app.repositories import monthly_target as monthly_target_repo
from app.models.user import User

router = APIRouter(prefix="/monthly-targets", tags=["Monthly Targets"])


@router.post("/", status_code=201, summary="Создать или обновить KPI")
async def set_kpi(
    data: MonthlyTargetCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    try:
        await monthly_target_repo.create_or_update_kpi(db, data)
        return {"detail": "KPI успешно установлен"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при установке KPI: {e}")


@router.get("/", response_model=list[MonthlyTargetOut], summary="Получить все KPI")
async def get_all_kpi(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    return await monthly_target_repo.get_all_kpis(db)


@router.delete("/{kpi_id}", summary="Удалить KPI")
async def delete_kpi(
    kpi_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    success = await monthly_target_repo.delete_kpi_by_id(db, kpi_id)
    if not success:
        raise HTTPException(status_code=404, detail="KPI не найден")
    return {"detail": "KPI успешно удалён"}