from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, is_admin
from app.repositories import customer_type as repo
from app.schemas.customer_type import CustomerTypeCreate, CustomerTypeRead, CustomerTypeUpdate

router = APIRouter(prefix="/customer-types", tags=["Customer Types"])

@router.get(
    "/",
    response_model=list[CustomerTypeRead],
    dependencies=[Depends(get_current_user)],
    summary="Список типов клиентов",
    description="Возвращает список всех типов клиентов (например, 'Физическое лицо', 'Юридическое лицо')."
)
async def list_all(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post(
    "/",
    response_model=CustomerTypeRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(is_admin)],
    summary="Создать тип клиента",
    description="Создаёт новый тип клиента, например 'B2B', 'B2C' и т.д."
)
async def create(data: CustomerTypeCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data.dict())

@router.patch(
    "/{type_id}",
    response_model=CustomerTypeRead,
    dependencies=[Depends(is_admin)],
    summary="Обновить тип клиента",
    description="Обновляет название существующего типа клиента по его ID."
)
async def update_customer_type(
    type_id: int,
    data: CustomerTypeUpdate,
    db: AsyncSession = Depends(get_db)
):
    customer_type = await repo.update(db, type_id, data)
    if not customer_type:
        raise HTTPException(status_code=404, detail="Тип клиента не найден")
    return customer_type

@router.delete(
    "/{type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(is_admin)],
    summary="Удалить тип клиента",
    description="Удаляет тип клиента по ID. Используется, если он больше не нужен."
)
async def delete_customer_type(
    type_id: int,
    db: AsyncSession = Depends(get_db)
):
    deleted = await repo.delete(db, type_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Тип клиента не найден")