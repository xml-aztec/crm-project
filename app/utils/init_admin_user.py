from sqlalchemy import select
from app.models.user import User
from app.models.role import Role
from app.core.security import get_password_hash
from app.core.config import settings

async def init_admin_user(db):
    result = await db.execute(
        select(User).where(User.email == settings.ADMIN_EMAIL)
    )
    existing_admin = result.scalar_one_or_none()
    if existing_admin:
        return

    role_result = await db.execute(select(Role).where(Role.name == "admin"))
    admin_role = role_result.scalar_one_or_none()
    if not admin_role:
        raise Exception("Роль 'admin' не найдена. Сначала вызовите init_roles.")

    admin = User(
        full_name=settings.ADMIN_FULL_NAME,
        email=settings.ADMIN_EMAIL,
        hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
        is_approved=True,
        role_id=admin_role.id
    )
    db.add(admin)
    await db.commit()