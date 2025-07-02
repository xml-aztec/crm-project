from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import datetime, timezone

from app.models.supply import Supply
from app.models.supply_item import SupplyItem
from app.models.product_stock import ProductStock
from app.schemas.supply import SupplyCreate

async def create_supply(db: AsyncSession, data: SupplyCreate):
    try:
        supply = Supply(
            supplier_name=data.supplier_name,
            warehouse_id=data.warehouse_id,
            delivered_at=data.delivered_at,
            created_at=datetime.now(timezone.utc),
        )
        db.add(supply)
        await db.flush()  

        for item in data.items:
            supply_item = SupplyItem(
                supply_id=supply.id,
                product_id=item.product_id,
                quantity=item.quantity,
                cost_price=item.cost_price,
                unit_price=item.unit_price,
            )
            db.add(supply_item)

            stmt = select(ProductStock).where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == data.warehouse_id
            )
            result = await db.execute(stmt)
            stock = result.scalar_one_or_none()

            if stock:
                stock.quantity += item.quantity
            else:
                db.add(ProductStock(
                    product_id=item.product_id,
                    warehouse_id=data.warehouse_id,
                    quantity=item.quantity
                ))

        await db.commit()
        await db.refresh(supply)
        return supply

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания поставки: {str(e)}")

async def get_all_supplies(db: AsyncSession):
    result = await db.execute(
        select(Supply)
        .options(selectinload(Supply.items))
        .order_by(Supply.created_at.desc())
    )
    return result.scalars().all()

async def get_supply_by_id(db: AsyncSession, supply_id: int):
    result = await db.execute(
        select(Supply)
        .where(Supply.id == supply_id)
        .options(selectinload(Supply.items))
    )
    return result.scalar_one_or_none()