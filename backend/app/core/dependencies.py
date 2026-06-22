from fastapi import Depends, HTTPException, Path, Request, status, Cookie
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import SessionLocal
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.repositories import user as user_repo
from app.repositories import order as order_repo
from app.rbac.service import user_is_admin

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_db():
    async with SessionLocal() as session:
        yield session

async def get_current_user(
    access_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не авторизован",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not access_token:
        raise HTTPException(status_code=401, detail="Не авторизован")

    try:
        payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")

    user = await user_repo.get_by_email(db, email)
    if not user or not user.is_active or not user.is_approved:
        raise HTTPException(status_code=401, detail="Пользователь недоступен")

    return user

async def is_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await user_is_admin(current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ разрешен только администраторам."
        )
    return current_user

async def is_order_owner_or_admin(
    order_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    order = await order_repo.get_order_by_id(db, order_id, current_user)

    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if not await user_is_admin(current_user, db) and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к заказу")

    return current_user