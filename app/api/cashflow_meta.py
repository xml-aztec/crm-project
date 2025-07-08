from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, is_admin
from app.models.user import User
from app.schemas.cashflow_type import CashFlowTypeCreate, CashFlowTypeOut, CashFlowTypeUpdate
from app.schemas.cashflow_category import CashFlowCategoryCreate, CashFlowCategoryOut, CashFlowCategoryUpdate
from app.repositories.cashflow_type import get_all_types, create_type, delete_type, update_type
from app.repositories.cashflow_category import get_all_categories, create_category, delete_category, update_category

router = APIRouter(prefix="/cashflow-meta", tags=["CashFlow Meta"])


@router.get(
    "/types",
    response_model=List[CashFlowTypeOut],
    summary="Список типов денежных потоков",
    description="""
    Возвращает все доступные типы денежных потоков, такие как "income", "expense" и т.д.

    Требуется авторизация администратора.
    """
)
async def list_types(db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    return await get_all_types(db)


@router.post(
    "/types",
    response_model=CashFlowTypeOut,
    summary="Создание типа денежного потока",
    description="""
    Создаёт новый тип денежного потока.  
    Например: "income" (доход) или "expense" (расход).

    Требуется авторизация администратора.
    """
)
async def add_type(data: CashFlowTypeCreate, db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    return await create_type(db, data.name)


@router.patch(
    "/types/{type_id}",
    response_model=CashFlowTypeOut,
    summary="Обновление типа денежного потока",
    description="""
    Позволяет изменить название ранее созданного типа денежных потоков.

    Если тип не найден — возвращается 404.

    Требуется авторизация администратора.
    """
)
async def edit_type(type_id: int, data: CashFlowTypeUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    obj = await update_type(db, type_id, data.name)
    if not obj:
        raise HTTPException(status_code=404, detail="Тип не найден")
    return obj


@router.delete(
    "/types/{type_id}",
    summary="Удаление типа денежного потока",
    description="""
    Удаляет тип денежного потока по ID.

    ⚠️ Если тип используется в других записях (`CashFlow`), удаление может привести к ошибке при проверке целостности данных.

    Требуется авторизация администратора.
    """
)
async def remove_type(type_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    await delete_type(db, type_id)
    return {"status": "deleted"}


@router.get(
    "/categories",
    response_model=List[CashFlowCategoryOut],
    summary="Список категорий денежных потоков",
    description="""
    Возвращает все категории денежных потоков, например:  
    "salary", "office rent", "equipment", "investment" и т.д.

    Требуется авторизация администратора.
    """
)
async def list_categories(db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    return await get_all_categories(db)


@router.post(
    "/categories",
    response_model=CashFlowCategoryOut,
    summary="Создание категории денежного потока",
    description="""
    Создаёт новую категорию для учёта финансов.  
    Примеры: "salary", "marketing", "taxes".

    Требуется авторизация администратора.
    """
)
async def add_category(data: CashFlowCategoryCreate, db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    return await create_category(db, data.name)


@router.patch(
    "/categories/{category_id}",
    response_model=CashFlowCategoryOut,
    summary="Обновление категории денежного потока",
    description="""
    Позволяет изменить название категории.  
    Если категория не найдена — возвращается 404.

    Требуется авторизация администратора.
    """
)
async def edit_category(category_id: int, data: CashFlowCategoryUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    obj = await update_category(db, category_id, data.name)
    if not obj:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return obj


@router.delete(
    "/categories/{category_id}",
    summary="Удаление категории денежного потока",
    description="""
    Удаляет категорию по ID.  
    ⚠️ При наличии связанных записей (`CashFlow`) может возникнуть ошибка.

    Требуется авторизация администратора.
    """
)
async def remove_category(category_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    await delete_category(db, category_id)
    return {"status": "deleted"}