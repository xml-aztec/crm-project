from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.schemas.role import RoleCreate, RoleRead
from app.repositories import role as repo

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/", response_model=list[RoleRead])
async def list_roles(db: AsyncSession = Depends(get_db)):
    return await repo.get_roles(db)