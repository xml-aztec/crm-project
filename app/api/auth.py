from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from app.core import security
from app.schemas.user import UserCreate, UserRead
from app.repositories import user as user_repo
from app.core.database import SessionLocal


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
    
@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await user_repo.get_by_email(db, form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="User is not approved")

    token = security.create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}