from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, is_admin
from app.repositories.payroll import generate_payrolls_for_month
from app.models.user import User

router = APIRouter(prefix="/payrolls", tags=["Payrolls"])

@router.post("/generate/")
async def generate_payrolls(month: str, db: AsyncSession = Depends(get_db), user: User = Depends(is_admin)):
    return await generate_payrolls_for_month(db, month, creator_id=user.id)