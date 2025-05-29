from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate, UserRead
from app.repositories import user as user_repo
from app.core.database import SessionLocal
from sqlalchemy.exc import IntegrityError

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.post("/register", response_model=UserRead)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await user_repo.get_by_email(db, user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    try:
        user = await user_repo.create_user(db, user_data)
        return user
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Invalid data")