from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import customer_type as repo
from app.schemas.customer_type import CustomerTypeCreate, CustomerTypeRead

router = APIRouter(prefix="/customer-types", tags=["Customer Types"])

@router.get(
    "/",
    response_model=list[CustomerTypeRead],
    summary="Список типов клиентов",
    description="Возвращает список всех типов клиентов (например, 'Физическое лицо', 'Юридическое лицо')."
)
async def list_all(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post(
    "/",
    response_model=CustomerTypeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать тип клиента",
    description="Создаёт новый тип клиента, например 'B2B', 'B2C' и т.д."
)
async def create(data: CustomerTypeCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data.dict())