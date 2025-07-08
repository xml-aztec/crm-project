from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.models.user import User
from app.models.payroll import Payroll

async def generate_payrolls_for_month(db: AsyncSession, month: str, creator_id: int):
    result = await db.execute(
        select(User).where(User.is_active == True, User.salary_base > 0)
    )
    users = result.scalars().all()

    payrolls = []

    for user in users:
        base = user.salary_base
        bonus = 0  # заглушка, можно связать с KPI
        penalty = 0  # заглушка, можно потом добавить
        total = base + bonus - penalty

        payroll = Payroll(
            user_id=user.id,
            month=month,
            base_salary=base,
            bonus_amount=bonus,
            penalty_amount=penalty,
            total_paid=total,
            created_by=creator_id,
        )
        payrolls.append(payroll)

    db.add_all(payrolls)
    await db.commit()
    return payrolls