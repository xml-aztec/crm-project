import asyncio
from typing import Awaitable, Callable

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.rbac.service import get_user_permissions, user_is_admin
from app.repositories import search as repo

router = APIRouter(prefix="/search", tags=["Search"])

RESULT_LIMIT = 5

# Право, которым уже защищён просмотр соответствующего раздела — глобальный
# поиск не должен открывать данные шире этого (см. app/api/{customers,
# orders,products,suppliers}.py). У "suppliers" нет своего ресурса в RBAC-
# матрице — список поставщиков (api/suppliers.py) защищён "supplies.read",
# поэтому поиск по поставщикам проверяет то же самое право.
ENTITY_PERMISSIONS = {
    "customers": "customers.read",
    "orders": "orders.read",
    "products": "products.read",
    "suppliers": "supplies.read",
}


@router.get(
    "",
    summary="Глобальный поиск",
    description="""
    Полнотекстовый поиск (Postgres tsvector/GIN) по клиентам, заказам,
    товарам, сотрудникам и поставщикам одновременно.

    Каждая группа результатов фильтруется правом доступа текущего
    пользователя — если прав нет, ключ этой группы отсутствует в ответе
    полностью (а не пустой список).
    """,
)
async def global_search(
    q: str = Query(..., description="Поисковый запрос, минимум 2 символа"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Запрос должен содержать минимум 2 символа"
        )

    permissions = await get_user_permissions(current_user.id, db)
    is_admin_user = await user_is_admin(current_user, db)

    searchers = {
        "customers": repo.search_customers,
        "orders": repo.search_orders,
        "products": repo.search_products,
        "suppliers": repo.search_suppliers,
    }
    allowed = {
        name: fn
        for name, fn in searchers.items()
        if ENTITY_PERMISSIONS[name] in permissions
    }
    # Сотрудники — отдельный случай: GET /users/ защищён Depends(is_admin),
    # а не правом из RBAC-матрицы (permissions.users.read существует в
    # матрице, но нигде фактически не проверяется) — поиск повторяет
    # реальное правило доступа, а не номинальное право.
    if is_admin_user:
        allowed["employees"] = repo.search_employees

    if not allowed:
        return {}

    async def _run_isolated(fn: Callable[..., Awaitable]) -> tuple[list[dict], int]:
        # asyncio.gather запускает эти корутины конкурентно, а AsyncSession
        # не потокобезопасен/корутинобезопасен для параллельных операций на
        # одном соединении — поэтому каждая группа получает свою собственную
        # сессию/соединение (как в scheduler/jobs.py), а не переиспользует
        # db из Depends(get_db) этого запроса.
        async with SessionLocal() as session:
            return await fn(session, query, RESULT_LIMIT)

    names = list(allowed.keys())
    results = await asyncio.gather(*(_run_isolated(allowed[name]) for name in names))

    return {
        name: {"items": items, "total": total}
        for name, (items, total) in zip(names, results)
    }
