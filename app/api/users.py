from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories import user as user_repo
from app.core.database import SessionLocal
from app.schemas.user import UserRead

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.get("/pending", response_model=list[UserRead])
async def get_pending_users(db: AsyncSession = Depends(get_db)):
    return await user_repo.list_pending_users(db)

@router.put("/{user_id}/approve", response_model=UserRead)
async def approve_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await user_repo.approve_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/{user_id}")
async def reject_user(user_id: int, db: AsyncSession = Depends(get_db)):
    await user_repo.delete_user(db, user_id)
    return {"detail": "User rejected and deleted"}