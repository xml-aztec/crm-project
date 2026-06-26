from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, and_, delete
from sqlalchemy.orm import selectinload, joinedload
from fastapi import HTTPException
from datetime import datetime, timezone
from typing import Optional, List, Dict, Tuple

from app.models.supply import Supply
from app.models.supply_item import SupplyItem
from app.models.product_stock import ProductStock
from app.models.supplier import Supplier
from app.schemas.supply import SupplyCreate, SupplyUpdate
from app.schemas.stock_log import StockLogCreate
from app.repositories.stock_log import create_stock_log


async def count_supplies(
    db: AsyncSession,
    warehouse_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> int:
    filters = []
    if warehouse_id is not None:
        filters.append(Supply.warehouse_id == warehouse_id)
    if supplier_id is not None:
        filters.append(Supply.supplier_id == supplier_id)
    if date_from is not None:
        filters.append(Supply.delivered_at >= date_from)
    if date_to is not None:
        filters.append(Supply.delivered_at <= date_to)

    stmt = select(func.count(Supply.id))
    if filters:
        stmt = stmt.where(and_(*filters))

    result = await db.execute(stmt)
    (total,) = result.one()
    return total or 0


async def create_supply(db: AsyncSession, data: SupplyCreate, created_by: int):
    try:
        supplier = await db.scalar(select(Supplier).where(Supplier.id == data.supplier_id))
        if not supplier:
            raise HTTPException(status_code=400, detail="Поставщик не найден")

        supply = Supply(
            supplier_id=data.supplier_id,
            warehouse_id=data.warehouse_id,
            delivered_at=data.delivered_at,
            created_at=datetime.now(timezone.utc),
            created_by=created_by
        )
        db.add(supply)
        await db.flush()

        product_ids = [item.product_id for item in data.items]
        stocks_result = await db.execute(
            select(ProductStock).where(
                and_(
                    ProductStock.product_id.in_(product_ids),
                    ProductStock.warehouse_id == data.warehouse_id
                )
            )
        )
        stocks: Dict[int, ProductStock] = {stock.product_id: stock for stock in stocks_result.scalars().all()}

        for item in data.items:
            supply_item = SupplyItem(
                supply_id=supply.id,
                product_id=item.product_id,
                quantity=item.quantity,
                cost_price=item.cost_price,
                unit_price=item.unit_price,
            )
            db.add(supply_item)

            stock = stocks.get(item.product_id)
            if stock:
                stock.quantity += item.quantity
            else:
                new_stock = ProductStock(
                    product_id=item.product_id,
                    warehouse_id=data.warehouse_id,
                    quantity=item.quantity
                )
                db.add(new_stock)
                stocks[item.product_id] = new_stock

        await db.commit()

        for item in data.items:
            await create_stock_log(db, StockLogCreate(
                product_id=item.product_id,
                warehouse_id=data.warehouse_id,
                quantity=item.quantity,
                type="incoming",
                note=f"Поставка #{supply.id}"
            ))

        result = await db.execute(
            select(Supply)
            .where(Supply.id == supply.id)
            .options(
                selectinload(Supply.items).joinedload(SupplyItem.product),
                selectinload(Supply.warehouse),
                selectinload(Supply.supplier),
                selectinload(Supply.created_user),
            )
        )
        supply = result.scalar_one_or_none()
        if not supply:
            raise HTTPException(status_code=404, detail="Поставка не найдена после создания")

        return supply

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания поставки: {str(e)}")


async def get_all_supplies(
    db: AsyncSession,
    warehouse_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[Supply], int]:
    filters = []
    if warehouse_id is not None:
        filters.append(Supply.warehouse_id == warehouse_id)
    if supplier_id is not None:
        filters.append(Supply.supplier_id == supplier_id)
    if date_from is not None:
        filters.append(Supply.delivered_at >= date_from)
    if date_to is not None:
        filters.append(Supply.delivered_at <= date_to)

    total = await count_supplies(
        db,
        warehouse_id=warehouse_id,
        supplier_id=supplier_id,
        date_from=date_from,
        date_to=date_to
    )

    query = (
        select(Supply)
        .options(
            selectinload(Supply.items).joinedload(SupplyItem.product),
            selectinload(Supply.warehouse),
            selectinload(Supply.supplier),
            selectinload(Supply.created_user),
        )
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

    return supplies, total


async def get_supply_by_id(db: AsyncSession, supply_id: int) -> Optional[Supply]:
    result = await db.execute(
        select(Supply)
        .where(Supply.id == supply_id)
        .options(
            selectinload(Supply.items).joinedload(SupplyItem.product),
            selectinload(Supply.warehouse),
            selectinload(Supply.supplier),
            selectinload(Supply.created_user),
        )
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
        old_product_ids = [item.product_id for item in supply.items]
        stock_result = await db.execute(
            select(ProductStock).where(
                and_(
                    ProductStock.product_id.in_(old_product_ids),
                    ProductStock.warehouse_id == supply.warehouse_id
                )
            )
        )
        stocks: Dict[int, ProductStock] = {stock.product_id: stock for stock in stock_result.scalars().all()}

        for item in supply.items:
            stock = stocks.get(item.product_id)
            if not stock or stock.quantity < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Недостаточно товара на складе для обновления (Товар ID: {item.product_id})"
                )

        for item in supply.items:
            stock = stocks.get(item.product_id)
            stock.quantity -= item.quantity

        await db.execute(delete(SupplyItem).where(SupplyItem.supply_id == supply.id))

        if data.supplier_id is not None:
            supplier = await db.scalar(select(Supplier).where(Supplier.id == data.supplier_id))
            if not supplier:
                raise HTTPException(status_code=400, detail="Поставщик не найден")
            supply.supplier_id = data.supplier_id

        if data.delivered_at is not None:
            supply.delivered_at = data.delivered_at

        if data.items:
            new_product_ids = [item.product_id for item in data.items]
            new_stock_result = await db.execute(
                select(ProductStock).where(
                    and_(
                        ProductStock.product_id.in_(new_product_ids),
                        ProductStock.warehouse_id == supply.warehouse_id
                    )
                )
            )
            new_stocks: Dict[int, ProductStock] = {stock.product_id: stock for stock in new_stock_result.scalars().all()}

            for item in data.items:
                new_item = SupplyItem(
                    supply_id=supply.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    cost_price=item.cost_price,
                    unit_price=item.unit_price
                )
                db.add(new_item)

                stock = new_stocks.get(item.product_id)
                if stock:
                    stock.quantity += item.quantity
                else:
                    new_stock = ProductStock(
                        product_id=item.product_id,
                        warehouse_id=supply.warehouse_id,
                        quantity=item.quantity
                    )
                    db.add(new_stock)
                    new_stocks[item.product_id] = new_stock

        await db.commit()

        if data.items:
            for item in data.items:
                await create_stock_log(db, StockLogCreate(
                    product_id=item.product_id,
                    warehouse_id=supply.warehouse_id,
                    quantity=item.quantity,
                    type="incoming",
                    note=f"Обновление поставки #{supply_id}"
                ))

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

    product_ids = [item.product_id for item in supply.items]
    stock_result = await db.execute(
        select(ProductStock).where(
            and_(
                ProductStock.product_id.in_(product_ids),
                ProductStock.warehouse_id == supply.warehouse_id
            )
        )
    )
    stocks: Dict[int, ProductStock] = {stock.product_id: stock for stock in stock_result.scalars().all()}

    for item in supply.items:
        stock = stocks.get(item.product_id)
        if not stock or stock.quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Нельзя удалить поставку: недостаточно товара на складе (Товар ID: {item.product_id})"
            )

    for item in supply.items:
        stock = stocks.get(item.product_id)
        stock.quantity -= item.quantity

    for item in supply.items:
        await create_stock_log(db, StockLogCreate(
            product_id=item.product_id,
            warehouse_id=supply.warehouse_id,
            quantity=item.quantity,
            type="adjust",
            note=f"Удаление поставки #{supply_id}"
        ))
        await db.delete(item)
    await db.delete(supply)

    await db.commit()
    return {"detail": "Поставка успешно удалена"}