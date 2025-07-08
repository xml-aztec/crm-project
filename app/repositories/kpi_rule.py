from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.kpi_rule import KpiRule
from app.schemas.kpi_rule import KpiRuleCreate, KpiRuleUpdate

async def list_rules(db: AsyncSession):
    result = await db.execute(select(KpiRule).order_by(KpiRule.min_percent.desc()))
    return result.scalars().all()

async def create_rule(db: AsyncSession, data: KpiRuleCreate):
    rule = KpiRule(**data.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

async def update_rule(db: AsyncSession, rule_id: int, data: KpiRuleUpdate) -> Optional[KpiRule]:
    result = await db.execute(select(KpiRule).where(KpiRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        return None

    for field, value in data.dict(exclude_unset=True).items():
        setattr(rule, field, value)

    await db.commit()
    await db.refresh(rule)
    return rule

async def delete_rule(db: AsyncSession, rule_id: int) -> bool:
    result = await db.execute(select(KpiRule).where(KpiRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        return False
    await db.delete(rule)
    await db.commit()
    return True