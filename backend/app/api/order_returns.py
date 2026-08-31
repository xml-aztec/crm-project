from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, is_manager_or_admin
from app.models.order_return import ReturnStatus
from app.models.user import User
from app.rbac.dependencies import require_permission
from app.repositories import order_return as repo
from app.schemas.order_return import ReturnCreate, ReturnDecision, ReturnOut

router = APIRouter(prefix="/returns", tags=["Returns"])


@router.post(
    "/",
    response_model=ReturnOut,
    status_code=status.HTTP_201_CREATED,
    summary="Оформить возврат по заказу",
    description="Частичный возврат по позициям подтверждённого заказа с указанием количества и состояния "
                "(годный/брак). Возврат, созданный менеджером/админом, применяется на склад сразу "
                "(статус 'completed'). Возврат, созданный сотрудником (staff), создаётся в статусе "
                "'requested' и не влияет на склад до подтверждения менеджером/админом.",
)
async def create_return(
    data: ReturnCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await repo.create_return(db, data, current_user)


@router.get(
    "/",
    response_model=list[ReturnOut],
    summary="Список возвратов с фильтрами",
    description="По order_id — вся история возвратов этого заказа (доступ как у самого заказа). "
                "Без order_id — админ видит все возвраты, менеджер — все возвраты своего филиала, "
                "сотрудник (staff) — только оформленные им самим.",
)
async def list_returns(
    order_id: Optional[int] = Query(None),
    status: Optional[ReturnStatus] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    __: User = Depends(require_permission("orders.read")),
):
    return await repo.get_returns(
        db, current_user, order_id=order_id, status=status, date_from=date_from, date_to=date_to
    )


@router.patch(
    "/{return_id}/decision",
    response_model=ReturnOut,
    summary="Подтвердить или отклонить возврат",
    description="Доступно только менеджеру или администратору. Только для возвратов в статусе 'requested'.",
)
async def decide_return(
    return_id: int,
    data: ReturnDecision,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(is_manager_or_admin),
):
    return await repo.decide_return(db, return_id, data.approve, data.reason, current_user)
