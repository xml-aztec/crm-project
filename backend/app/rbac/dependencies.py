"""RBAC FastAPI dependencies. Not wired into any router yet (Stage C) —
follows the same style as app.core.dependencies.is_admin."""
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.rbac.service import user_has_permission


def require_permission(permission_code: str):
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not await user_has_permission(current_user.id, permission_code, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав: требуется '{permission_code}'.",
            )
        return current_user

    return dependency
