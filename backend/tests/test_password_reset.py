import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from app.core.security import get_password_hash, verify_password
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _make_user(db_session, password: str = "OldPassword123") -> User:
    user = User(
        email=f"reset-test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        full_name="Reset Test User",
        is_active=True,
        is_approved=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _make_token(db_session, user_id: int, *, used: bool = False, expires_in_minutes: int = 30) -> str:
    token = uuid.uuid4().hex
    reset_token = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes),
        used=used,
    )
    db_session.add(reset_token)
    await db_session.commit()
    return token


async def test_forgot_password_existing_email_creates_token_and_sends_email(client, db_session):
    user = await _make_user(db_session)

    with patch("app.api.auth.send_password_reset_email", new_callable=AsyncMock) as mock_send:
        resp = await client.post("/auth/forgot-password", json={"email": user.email})

    assert resp.status_code == 200
    mock_send.assert_called_once()
    _, sent_email, reset_link = mock_send.call_args.args
    assert sent_email == user.email
    assert "token=" in reset_link

    result = await db_session.execute(
        select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
    )
    tokens = result.scalars().all()
    assert len(tokens) == 1
    assert tokens[0].used is False


async def test_forgot_password_nonexistent_email_same_response(client):
    with patch("app.api.auth.send_password_reset_email", new_callable=AsyncMock) as mock_send:
        resp = await client.post(
            "/auth/forgot-password", json={"email": f"no-such-user-{uuid.uuid4().hex[:8]}@example.com"}
        )

    assert resp.status_code == 200
    assert resp.json() == {
        "message": "Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля"
    }
    mock_send.assert_not_called()


async def test_reset_password_with_valid_token_changes_password(client, db_session):
    user = await _make_user(db_session, password="OldPassword123")
    token = await _make_token(db_session, user.id)

    resp = await client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "NewPassword456"},
    )
    assert resp.status_code == 200

    # Проверяем смену пароля напрямую через verify_password (то же самое, что
    # делает сам /auth/login внутри) — не дёргаем сам эндпоинт логина, чтобы не
    # делить с другими тестами общий per-IP rate limit (5/minute) на /auth/login.
    await db_session.refresh(user)
    assert not verify_password("OldPassword123", user.hashed_password)
    assert verify_password("NewPassword456", user.hashed_password)


async def test_reset_password_expired_token(client, db_session):
    user = await _make_user(db_session)
    token = await _make_token(db_session, user.id, expires_in_minutes=-5)

    resp = await client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "NewPassword456"},
    )
    assert resp.status_code == 400


async def test_reset_password_used_token(client, db_session):
    user = await _make_user(db_session)
    token = await _make_token(db_session, user.id, used=True)

    resp = await client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "NewPassword456"},
    )
    assert resp.status_code == 400


async def test_reset_password_nonexistent_token(client):
    resp = await client.post(
        "/auth/reset-password",
        json={"token": f"does-not-exist-{uuid.uuid4().hex}", "new_password": "NewPassword456"},
    )
    assert resp.status_code == 400
