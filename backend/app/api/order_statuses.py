from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db, is_admin
from app.repositories import order_status as repo
from app.schemas.order_status import OrderStatusCreate, OrderStatusRead

router = APIRouter(prefix="/order-statuses", tags=["Order Statuses"])

@router.get(
    "/",
    response_model=list[OrderStatusRead],
    dependencies=[Depends(get_current_user)],
    summary="Список статусов заказов",
    description="Возвращает все статусы заказов, например: 'Новый', 'В работе', 'Завершен', 'Отменён'."
)
async def list_all(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post(
    "/",
    response_model=OrderStatusRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(is_admin)],
    summary="Создать статус заказа",
    description="Создает новый статус заказа, который может быть назначен заказу."
)
async def create(data: OrderStatusCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data.dict())