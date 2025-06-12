from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, is_admin, get_current_user
from app.schemas.monthly_target import MonthlyTargetCreate, MonthlyTargetOut
from app.repositories import monthly_target as monthly_target_repo
from app.models.user import User
from app.utils.validators import validate_month_format  

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


@router.get("/{manager_id}/{month}", response_model=MonthlyTargetOut, summary="Получить KPI менеджера за месяц")
async def get_kpi(
    manager_id: int,
    month: str,  # в формате YYYY-MM
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    is_admin_user: bool = Depends(is_admin),
):
    if not is_admin_user and current_user.id != manager_id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    month_with_day = validate_month_format(month)  
    kpi = await monthly_target_repo.get_manager_kpi(db, manager_id, month_with_day)
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI не найден")
    return kpi