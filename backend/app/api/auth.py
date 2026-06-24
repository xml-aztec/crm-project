from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from app.core import security
from app.schemas.user import UserRegister, UserRead
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.repositories import user as user_repo
from app.repositories import password_reset as reset_repo
from app.models.role import Role
from app.core.dependencies import get_db
from app.core.limiter import limiter
from app.utils.email import send_registration_email, send_password_reset_email
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация нового пользователя",
    description="""
    Регистрирует нового пользователя и сохраняет в базу. \
    Требуется одобрение администратора (is_approved=False по умолчанию).

    Возвращает данные пользователя без пароля.
    """
)
@limiter.limit("3/minute")
async def register(
    request: Request,
    user_data: UserRegister,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    existing = await user_repo.get_by_email(db, user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Роль при публичной регистрации не выбирается клиентом — всегда "manager",
    # чтобы исключить эскалацию привилегий через role_id (CWE-915).
    role_result = await db.execute(select(Role).where(Role.name == "manager"))
    default_role = role_result.scalar_one_or_none()
    if not default_role:
        raise HTTPException(status_code=500, detail="Роль 'manager' не найдена. Обратитесь к администратору.")

    try:
        user = await user_repo.create_user(db, user_data, role_id=default_role.id)
        await send_registration_email(background_tasks, user.email, user.full_name)
        return user
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Invalid data")

@router.post(
    "/login",
    summary="Вход пользователя (авторизация)",
    description="""
    Аутентифицирует пользователя по email и паролю. \
    Устанавливает JWT access token в HTTP-only куки.
    """,
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    response: Response = None,
):
    user = await user_repo.get_by_email(db, form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="User is not approved")

    token = security.create_access_token({"sub": user.email})

    is_https = settings.BASE_URL.startswith("https://")
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_https,
        samesite="lax",
        max_age=60 * 60,
        expires=60 * 60,
    )

    return {"message": "Login successful"}

@router.post("/logout", summary="Выход пользователя")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}

@router.post(
    "/forgot-password",
    summary="Запрос сброса пароля",
    description="""
    Принимает email и, если такой пользователь существует, отправляет ему
    письмо со ссылкой для сброса пароля (ссылка действительна 30 минут).

    Ответ всегда одинаковый независимо от того, найден пользователь или
    нет — это защита от перебора email-адресов (CWE-204 information exposure).
    """,
)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user = await user_repo.get_by_email(db, data.email)
    if user:
        reset_token = await reset_repo.create_reset_token(db, user.id)
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
        await send_password_reset_email(background_tasks, user.email, reset_link)

    return {"message": "Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля"}

@router.post(
    "/reset-password",
    summary="Сброс пароля по токену",
    description="""
    Принимает токен (из ссылки в письме) и новый пароль. Проверяет, что
    токен существует, не использован и не истёк. При успехе меняет пароль
    и помечает использованными все неиспользованные токены пользователя.
    """,
)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    reset_token = await reset_repo.get_token(db, data.token)
    if (
        not reset_token
        or reset_token.used
        or reset_token.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="Недействительный или истёкший токен")

    await user_repo.update_password(db, reset_token.user_id, data.new_password)
    await reset_repo.invalidate_user_tokens(db, reset_token.user_id)

    return {"message": "Пароль успешно изменён"}