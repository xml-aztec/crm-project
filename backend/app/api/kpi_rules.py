from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.dependencies import get_db, is_admin
from app.schemas.kpi_rule import KpiRuleCreate, KpiRuleOut, KpiRuleUpdate
from app.repositories import kpi_rule as kpi_rule_repo
from app.models.user import User

router = APIRouter(prefix="/kpi-rules", tags=["KPI Rules"])

@router.get("/", response_model=List[KpiRuleOut])
async def get_rules(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await kpi_rule_repo.list_rules(db)

@router.post("/", response_model=KpiRuleOut, status_code=201)
async def create_rule(
    data: KpiRuleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    return await kpi_rule_repo.create_rule(db, data)

@router.patch("/{rule_id}", response_model=KpiRuleOut)
async def patch_rule(
    rule_id: int,
    data: KpiRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    rule = await kpi_rule_repo.update_rule(db, rule_id, data)
    if not rule:
        raise HTTPException(status_code=404, detail="Правило не найдено")
    return rule

@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin)
):
    success = await kpi_rule_repo.delete_rule(db, rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Правило не найдено")
    return {"detail": f"Правило ID {rule_id} удалено"}