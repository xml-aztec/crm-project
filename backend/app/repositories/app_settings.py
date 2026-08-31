from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.app_settings import AppSettings

SETTINGS_ID = 1


async def get_settings(db: AsyncSession) -> AppSettings:
    """Всегда возвращает реальный объект — создаёт дефолтную (все поля
    пустые) строку при первом обращении, чтобы вызывающему коду (PDF,
    подстановка склада по умолчанию) не нужно было отдельно обрабатывать
    случай «настройки ещё не заданы»."""
    result = await db.execute(select(AppSettings).where(AppSettings.id == SETTINGS_ID))
    settings = result.scalar_one_or_none()
    if settings:
        return settings

    settings = AppSettings(id=SETTINGS_ID)
    db.add(settings)
    await db.commit()
    await db.refresh(settings)
    return settings


async def update_settings(db: AsyncSession, data: dict) -> AppSettings:
    settings = await get_settings(db)
    for field, value in data.items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings
