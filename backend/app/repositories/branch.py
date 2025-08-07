from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchUpdate

async def get_all(db: AsyncSession):
    result = await db.execute(select(Branch))
    return result.scalars().all()

async def get_by_id(db: AsyncSession, branch_id: int):
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    return result.scalar_one_or_none()

async def create(db: AsyncSession, data: BranchCreate):
    branch = Branch(**data.model_dump())
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return branch

async def update(db: AsyncSession, branch_id: int, data: BranchUpdate):
    branch = await get_by_id(db, branch_id)
    if not branch:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(branch, key, value)
    await db.commit()
    await db.refresh(branch)
    return branch

async def delete(db: AsyncSession, branch_id: int):
    branch = await get_by_id(db, branch_id)
    if branch:
        await db.delete(branch)
        await db.commit()