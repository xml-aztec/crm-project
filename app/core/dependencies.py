from fastapi import Depends, HTTPException, Path, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal
from app.core import security
from app.models.user import User
from app.repositories import user as user_repo
from app.models.user import User
from app.repositories import order as order_repo

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_db():
    async with SessionLocal() as session:
        yield session

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await user_repo.get_by_email(db, email)
    if user is None or not user.is_approved or not user.is_active:
        raise credentials_exception

    return user

async def is_admin(current_user: User = Depends(get_current_user)):
    if not current_user.role or current_user.role.name != "admin":
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

    if current_user.role.name != "Админ" and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к заказу")

    return current_user