from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, is_admin
from app.repositories import app_settings as repo
from app.schemas.app_settings import AppSettingsOut, AppSettingsUpdate

router = APIRouter(prefix="/settings/general", tags=["General Settings"], dependencies=[Depends(is_admin)])


@router.get("/", response_model=AppSettingsOut, summary="Получить общие настройки системы")
async def get_general_settings(db: AsyncSession = Depends(get_db)):
    return await repo.get_settings(db)


@router.patch("/", response_model=AppSettingsOut, summary="Обновить общие настройки системы")
async def update_general_settings(data: AppSettingsUpdate, db: AsyncSession = Depends(get_db)):
    return await repo.update_settings(db, data.model_dump(exclude_unset=True))
