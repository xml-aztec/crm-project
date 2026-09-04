import bcrypt
from fastapi import Depends, HTTPException, status
from jose import jwt
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.rbac.service import user_is_admin

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# bcrypt используется напрямую, без passlib.
#
# passlib не выпускал релизов с октября 2020 и несовместим с bcrypt 4.x
# (обращается к приватному bcrypt.__about__), из-за чего bcrypt в проекте был
# закреплён на ветке 3.x 2022 года. Убрав прослойку, снимаем и это
# ограничение. Формат хэшей не меняется: passlib с алгоритмом bcrypt писал
# стандартные строки `$2b$...`, которые bcrypt.checkpw читает как есть —
# существующие пароли продолжают работать без сброса.

# bcrypt обрабатывает не более 72 БАЙТ пароля. passlib молча обрезал длинные
# пароли, а bcrypt 4.x на такой вход бросает ValueError. Обрезаем явно и в
# одном месте, чтобы поведение для уже сохранённых хэшей осталось прежним.
_BCRYPT_MAX_BYTES = 72


def _prepare(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(_prepare(plain_password), hashed_password.encode("utf-8"))
    except ValueError:
        # Хэш повреждён или в неизвестном формате — это не совпадение,
        # но и не повод ронять запрос пятисоткой.
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

async def require_admin(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await user_is_admin(user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can perform this action"
        )
    return user