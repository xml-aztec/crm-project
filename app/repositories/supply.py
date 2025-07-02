from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, insert, update
from sqlalchemy.orm import selectinload, joinedload
from fastapi import HTTPException
from datetime import datetime, timezone
from typing import Optional

from app.models.supply import Supply
from app.models.supply_item import SupplyItem
from app.models.product_stock import ProductStock
from app.schemas.supply import SupplyCreate, SupplyUpdate


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


async def get_all_supplies(
    db: AsyncSession,
    warehouse_id: Optional[int] = None,
    supplier_name: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0
):
    filters = []
    if warehouse_id:
        filters.append(Supply.warehouse_id == warehouse_id)
    if supplier_name:
        filters.append(Supply.supplier_name.ilike(f"%{supplier_name}%"))
    if date_from:
        filters.append(Supply.delivered_at >= date_from)
    if date_to:
        filters.append(Supply.delivered_at <= date_to)

    query = (
        select(Supply)
        .options(selectinload(Supply.items).joinedload(SupplyItem.product))
        .order_by(Supply.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    supplies = result.scalars().unique().all()

    for supply in supplies:
        for item in supply.items:
            item.product_name = item.product.name if item.product else ""

    return supplies


async def get_supply_by_id(db: AsyncSession, supply_id: int):
    result = await db.execute(
        select(Supply)
        .where(Supply.id == supply_id)
        .options(selectinload(Supply.items).joinedload(SupplyItem.product))
    )
    supply = result.scalar_one_or_none()

    if supply:
        for item in supply.items:
            item.product_name = item.product.name if item.product else ""

    return supply

async def update_supply(db: AsyncSession, supply_id: int, data: SupplyUpdate):
    supply = await get_supply_by_id(db, supply_id)
    if not supply:
        raise HTTPException(status_code=404, detail="Поставка не найдена")

    try:
        for item in supply.items:
            stock_stmt = select(ProductStock).where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == supply.warehouse_id
            )
            stock_result = await db.execute(stock_stmt)
            stock = stock_result.scalar_one_or_none()
            if stock:
                stock.quantity -= item.quantity

        await db.execute(
            SupplyItem.__table__.delete().where(SupplyItem.supply_id == supply.id)
        )

        if data.supplier_name is not None:
            supply.supplier_name = data.supplier_name
        if data.delivered_at is not None:
            supply.delivered_at = data.delivered_at

        if data.items:
            for item in data.items:
                new_item = SupplyItem(
                    supply_id=supply.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    cost_price=item.cost_price,
                    unit_price=item.unit_price
                )
                db.add(new_item)

                stock_stmt = select(ProductStock).where(
                    ProductStock.product_id == item.product_id,
                    ProductStock.warehouse_id == supply.warehouse_id
                )
                stock_result = await db.execute(stock_stmt)
                stock = stock_result.scalar_one_or_none()

                if stock:
                    stock.quantity += item.quantity
                else:
                    db.add(ProductStock(
                        product_id=item.product_id,
                        warehouse_id=supply.warehouse_id,
                        quantity=item.quantity
                    ))

        await db.commit()
        await db.refresh(supply)

        return await get_supply_by_id(db, supply_id)

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении поставки: {str(e)}")


async def delete_supply(db: AsyncSession, supply_id: int):
    result = await db.execute(
        select(Supply).where(Supply.id == supply_id).options(
            selectinload(Supply.items)
        )
    )
    supply = result.scalar_one_or_none()

    if not supply:
        raise HTTPException(status_code=404, detail="Поставка не найдена")

    for item in supply.items:
        stock_query = await db.execute(
            select(ProductStock).where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == supply.warehouse_id
            )
        )
        stock = stock_query.scalar_one_or_none()

        if not stock or stock.quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Нельзя удалить поставку: недостаточно товара на складе (Товар ID: {item.product_id})"
            )
        
    for item in supply.items:
        stock_query = await db.execute(
            select(ProductStock).where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == supply.warehouse_id
            )
        )
        stock = stock_query.scalar_one()
        stock.quantity -= item.quantity

    for item in supply.items:
        await db.delete(item)
    await db.delete(supply)

    await db.commit()
    return {"detail": "Поставка успешно удалена"}