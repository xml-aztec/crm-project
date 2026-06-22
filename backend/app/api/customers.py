from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.dependencies import get_current_user, get_db, is_admin
from app.repositories import customer as repo
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get(
    "/",
    response_model=List[CustomerRead],
    dependencies=[Depends(get_current_user)],
    summary="Список клиентов",
    description="Возвращает список всех клиентов с их данными: имя, телефон, email, адрес и тип клиента."
)
async def list_customers(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await repo.get_all(db, skip=skip, limit=limit)

@router.get(
    "/{customer_id}",
    response_model=CustomerRead,
    dependencies=[Depends(get_current_user)],
    summary="Получить клиента по ID",
    description="Возвращает данные конкретного клиента по его ID. Если клиент не найден, возвращает 404."
)
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    customer = await repo.get_by_id(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return customer

@router.post(
    "/",
    response_model=CustomerRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(is_admin)],
    summary="Создать нового клиента",
    description="Создаёт нового клиента с указанными данными: имя, телефон, email, адрес, тип клиента."
)
async def create_customer(data: CustomerCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data)

@router.patch(
    "/{customer_id}",
    response_model=CustomerRead,
    dependencies=[Depends(is_admin)],
    summary="Обновить данные клиента",
    description="Обновляет информацию о клиенте по его ID. Обновляемые поля: имя, телефон, email, адрес, тип клиента."
)
async def update_customer(customer_id: int, data: CustomerUpdate, db: AsyncSession = Depends(get_db)):
    customer = await repo.update(db, customer_id, data)
    if not customer:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return customer

@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(is_admin)],
    summary="Удалить клиента",
    description="Удаляет клиента по его ID. Если клиент не найден — возвращает 404."
)
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await repo.delete(db, customer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Клиент не найден")