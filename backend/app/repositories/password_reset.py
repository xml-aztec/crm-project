import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.password_reset_token import PasswordResetToken

RESET_TOKEN_TTL_MINUTES = 30


async def create_reset_token(db: AsyncSession, user_id: int) -> PasswordResetToken:
    reset_token = PasswordResetToken(
        user_id=user_id,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
    )
    db.add(reset_token)
    await db.commit()
    await db.refresh(reset_token)
    return reset_token


async def get_token(db: AsyncSession, token: str) -> Optional[PasswordResetToken]:
    result = await db.execute(select(PasswordResetToken).where(PasswordResetToken.token == token))
    return result.scalar_one_or_none()


async def invalidate_user_tokens(db: AsyncSession, user_id: int) -> None:
    """Помечает использованными все неиспользованные токены пользователя —
    вызывается после успешного сброса пароля, включая токен, которым только
    что воспользовались."""
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user_id, PasswordResetToken.used.is_(False))
        .values(used=True)
    )
    await db.commit()
