from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from app.core import security
from app.schemas.user import UserRegister, UserRead
from app.repositories import user as user_repo
from app.models.role import Role
from app.core.dependencies import get_db
from app.core.limiter import limiter
from app.utils.email import send_registration_email
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