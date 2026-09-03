"""RBAC FastAPI dependencies, wired into routers as of Stage D — follows the
same style as app.core.dependencies.is_admin."""
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.rbac.service import get_user_permissions

_CACHE_ATTR = "_rbac_permissions"


async def permissions_for_request(
    request: Request, user_id: int, db: AsyncSession
) -> set[str]:
    """Права пользователя с кэшем на время одного HTTP-запроса.

    get_user_permissions соединяет три таблицы, и раньше этот запрос уходил в
    БД на КАЖДУЮ проверку: эндпоинты с двумя-тремя require_permission платили
    за него по разу на каждую, поверх запроса на загрузку самого пользователя
    в get_current_user. В пределах запроса набор прав измениться не может,
    поэтому держим его на request.state.

    Кэш намеренно привязан к user_id: если внутри одного запроса права
    проверяются для разных пользователей, вторая проверка сходит в БД, а не
    получит чужой закэшированный набор.
    """
    cached = getattr(request.state, _CACHE_ATTR, None)
    if cached is not None and cached[0] == user_id:
        return cached[1]

    permissions = await get_user_permissions(user_id, db)
    setattr(request.state, _CACHE_ATTR, (user_id, permissions))
    return permissions


def require_permission(permission_code: str):
    async def dependency(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        permissions = await permissions_for_request(request, current_user.id, db)
        if permission_code not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав: требуется '{permission_code}'.",
            )
        return current_user

    return dependency
