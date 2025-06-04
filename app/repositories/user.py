from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from sqlalchemy import delete
from app.models.user import User
from app.schemas.user import UserCreate
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).where(User.is_approved == True))
    return result.scalars().all()

async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.role)) 
        .where(User.email == email)
    )
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user_data: UserCreate):
    hashed_password = pwd_context.hash(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role_id=user_data.role_id,
        position_id=user_data.position_id
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def update_user_admin(
    db: AsyncSession, user_id: int, data: dict
) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user

async def update_user_self(
    db: AsyncSession, user_id: int, data: dict
) -> Optional[User]:
    allowed_fields = {"full_name", "email", "phone"}  
    filtered_data = {k: v for k, v in data.items() if k in allowed_fields}

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    for key, value in filtered_data.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user

async def list_pending_users(db: AsyncSession):
    result = await db.execute(select(User).where(User.is_approved == False))
    return result.scalars().all()

async def approve_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_approved = True
        await db.commit()
        await db.refresh(user)
    return user

async def list_pending_users(db: AsyncSession):
    result = await db.execute(select(User).where(User.is_approved == False))
    return result.scalars().all()

async def approve_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_approved = True
        await db.commit()
        await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, user_id: int):
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()