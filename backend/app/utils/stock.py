"""Операции над складскими остатками.

Два правила, которым подчинён весь файл (аудит H1, H2):

1. НИ ОДНА функция здесь не коммитит. Транзакцией управляет вызывающий код
   (repositories/order.py, repositories/order_return.py) — он же решает, что
   считается одной неделимой операцией. Раньше reserve/restore/release
   коммитили каждая сама, из-за чего, например, confirm_order выполнялся в
   трёх отдельных транзакциях: остаток уже зафиксирован, а флаг заказа ещё
   нет — сбой между ними оставлял склад и заказ рассогласованными.

2. Любой путь «прочитать остаток → решить → записать» берёт блокировку строки
   через SELECT ... FOR UPDATE. Без неё два одновременных заказа на последнюю
   единицу товара оба проходили проверку и оба списывали остаток (TOCTOU), а
   deduct_stock_for_order к тому же считал новое значение в Python
   (`stock.quantity -= n`) — классическая потерянная запись.

   Простое прибавление/вычитание без предварительного чтения (reserve,
   restore, release) блокировки не требует: `SET quantity = quantity + :n`
   атомарен на уровне СУБД сам по себе.
"""
from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.product_stock import ProductStock
from app.models.order import Order


async def _order_warehouse_id(db: AsyncSession, order_id: int):
    result = await db.execute(select(Order.warehouse_id).where(Order.id == order_id))
    return result.scalar_one_or_none()


async def _order_items(db: AsyncSession, order_id: int) -> list[OrderItem]:
    result = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    return list(result.scalars().all())


async def restore_stock_for_order(db: AsyncSession, order_id: int):
    """Восстанавливает физический остаток при отмене/разподтверждении подтверждённого заказа."""
    warehouse_id = await _order_warehouse_id(db, order_id)
    if warehouse_id is None:
        return

    for item in await _order_items(db, order_id):
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(quantity=ProductStock.quantity + item.quantity)
        )

    await db.flush()


async def reserve_stock_for_order(db: AsyncSession, order_id: int):
    """Резервирует остаток для нового/возвращённого в ожидание заказа."""
    warehouse_id = await _order_warehouse_id(db, order_id)
    if warehouse_id is None:
        return

    for item in await _order_items(db, order_id):
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(reserved=ProductStock.reserved + item.quantity)
        )

    await db.flush()


async def release_stock_reservation(db: AsyncSession, order_id: int):
    """Снимает резерв при отмене/удалении неподтверждённого заказа."""
    warehouse_id = await _order_warehouse_id(db, order_id)
    if warehouse_id is None:
        return

    for item in await _order_items(db, order_id):
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(reserved=func.greatest(ProductStock.reserved - item.quantity, 0))
        )

    await db.flush()


async def check_stock_before_order_creation(
    db: AsyncSession,
    items: list[OrderItem],
    warehouse_id: int
):
    """Проверяет доступность и УДЕРЖИВАЕТ строки остатков до конца транзакции.

    Блокировка здесь — половина защиты от гонки: вторая половина в том, что
    вызывающий create_order резервирует остаток в этой же транзакции, а не
    отдельным коммитом после. Пока она не завершилась, параллельный заказ на
    тот же товар ждёт на SELECT ... FOR UPDATE и видит уже обновлённый резерв.
    """
    for item in items:
        stmt = (
            select(ProductStock.quantity, ProductStock.reserved)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .with_for_update()
        )
        result = await db.execute(stmt)
        row = result.one_or_none()

        if row is None:
            raise HTTPException(400, detail=f"Товар id={item.product_id} отсутствует на складе ID={warehouse_id}")

        quantity, reserved = row
        available = (quantity or 0) - (reserved or 0)

        if available < item.quantity:
            product_result = await db.execute(
                select(Product.name).where(Product.id == item.product_id)
            )
            product_name = product_result.scalar_one_or_none() or f"ID={item.product_id}"
            raise HTTPException(
                400,
                detail=f"Недостаточно товара '{product_name}' на складе (нужно {item.quantity}, доступно {available})"
            )


async def apply_return_stock_effect(
    db: AsyncSession,
    warehouse_id: int,
    product_id: int,
    quantity: int,
    condition: str,
):
    """Применяет эффект возврата на склад: годный товар — обратно в
    продаваемый остаток (та же механика, что и restore_stock_for_order),
    брак — в отдельный defective_quantity, не увеличивая доступный для
    продажи остаток. Без внутреннего commit — вызывающий код (создание/
    подтверждение возврата) коммитит один раз после применения всех позиций
    возврата и записи в историю заказа."""
    if condition == "resalable":
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(quantity=ProductStock.quantity + quantity)
        )
    else:
        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == product_id,
                ProductStock.warehouse_id == warehouse_id
            )
            .values(defective_quantity=ProductStock.defective_quantity + quantity)
        )


async def deduct_stock_for_order(db: AsyncSession, order: Order):
    """Списывает остаток при подтверждении заказа.

    Строка сначала блокируется (FOR UPDATE), и только потом проверяется и
    изменяется — иначе между проверкой `stock.quantity < item.quantity` и
    записью успевает вклиниться параллельное подтверждение, и остаток уходит
    в минус. Само изменение выражено через UPDATE от текущего значения
    колонки, а не через пересчёт в Python.
    """
    await db.refresh(order, ["items", "warehouse"])

    for item in order.items:
        locked = await db.execute(
            select(ProductStock.quantity)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == order.warehouse_id
            )
            .with_for_update()
        )
        row = locked.one_or_none()

        if row is None:
            raise HTTPException(400, detail=f"Товар id={item.product_id} не найден на складе")

        (current_quantity,) = row
        if (current_quantity or 0) < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно товара id={item.product_id} на складе id={order.warehouse_id}"
            )

        await db.execute(
            update(ProductStock)
            .where(
                ProductStock.product_id == item.product_id,
                ProductStock.warehouse_id == order.warehouse_id
            )
            .values(
                quantity=ProductStock.quantity - item.quantity,
                # Товар переходит из «зарезервирован» в «списан».
                reserved=func.greatest(ProductStock.reserved - item.quantity, 0),
            )
        )

    await db.flush()
