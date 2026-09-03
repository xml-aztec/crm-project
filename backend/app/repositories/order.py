from datetime import date, datetime, time, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, joinedload
from fastapi import HTTPException

from app.models.customer import Customer
from app.models.order import Order
from app.repositories import order_history as history_repo
from app.models.order_status import OrderStatus
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.product_stock import ProductStock
from app.models.user import User
from app.models.warehouse import Warehouse
from app.utils.orders import price_order_item, recalculate_order_total
from app.utils.stock import (
    check_stock_before_order_creation,
    deduct_stock_for_order,
    restore_stock_for_order,
    reserve_stock_for_order,
    release_stock_reservation,
)
from app.schemas.stock_log import StockLogCreate
from app.repositories.stock_log import create_stock_log
from app.rbac.service import user_is_admin


async def check_stock_before_confirmation(db: AsyncSession, order: Order):
    await db.refresh(order, ["items"])

    for item in order.items:
        stmt = select(ProductStock).where(
            ProductStock.product_id == item.product_id,
            ProductStock.warehouse_id == order.warehouse_id
        )
        result = await db.execute(stmt)
        stock = result.scalar_one_or_none()

        if not stock or stock.quantity < item.quantity:
            product_name = item.product.name if item.product else f"Product ID {item.product_id}"
            warehouse_name = order.warehouse.name if order.warehouse else f"Warehouse ID {order.warehouse_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно товара '{product_name}' на складе '{warehouse_name}'."
            )


async def get_order_by_id(db: AsyncSession, order_id: int, current_user: User) -> Optional[Order]:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        return None

    # Единственное место, где решается «видит ли этот пользователь этот
    # заказ» — сюда приходят и GET /orders/{id}, и зависимость
    # is_order_owner_or_admin. Раньше проверка была инвертирована: условие
    # срабатывало при order.user_id == current_user.id, то есть владельцу
    # свой отменённый заказ закрывали, а постороннему отдавали любой чужой
    # (проверки владения не было вовсе). Списочный get_orders ниже всегда
    # ограничивал не-админа своими и неотменёнными — здесь повторяем то же
    # правило.
    if not await user_is_admin(current_user, db):
        if order.user_id != current_user.id:
            raise HTTPException(403, detail="Нет доступа к заказу")
        if order.status and order.status.name == "Отменен":
            raise HTTPException(403, detail="Вы не можете просматривать отменённый заказ")

    return order


async def create_order(
    db: AsyncSession,
    order_data: dict,
    items_data: list[OrderItem],
    current_user: User 
):
    if not await user_is_admin(current_user, db):
        if order_data.get("warehouse_id") is None:
            raise HTTPException(400, detail="Склад должен быть указан")

        result = await db.execute(
            select(Warehouse.branch_id).where(Warehouse.id == order_data["warehouse_id"])
        )
        branch_id = result.scalar_one_or_none()

        if current_user.branch_id is not None and branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=403,
                detail="Нельзя создать заказ на складе другого филиала"
            )

    if not order_data.get("status_id"):
        result = await db.execute(
            select(OrderStatus.id).where(OrderStatus.name == "Новый")
        )
        default_status_id = result.scalar_one_or_none()
        if not default_status_id:
            raise HTTPException(400, detail="Статус 'Новый' не найден. Добавьте его в базу.")
        order_data["status_id"] = default_status_id

    await check_stock_before_order_creation(db, items_data, order_data["warehouse_id"])

    order = Order(**order_data, user_id=current_user.id, created_at=datetime.now(timezone.utc))
    db.add(order)
    await db.flush()

    for item in items_data:
        # Цена целиком на сервере: из каталога, со скидкой в допустимом
        # диапазоне. Присланные клиентом unit_price/final_price больше не
        # используются (и отсутствуют в схеме) — см. price_order_item.
        unit_price, final_price = await price_order_item(
            db,
            product_id=item.product_id,
            quantity=item.quantity,
            discount_percent=getattr(item, "discount_percent", None),
        )

        db.add(OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=unit_price,
            final_price=final_price,
        ))

    await history_repo.add_entry(db, order.id, "created", "Заказ создан", user_id=current_user.id)

    # Резерв берётся в ТОЙ ЖЕ транзакции, что и сам заказ. Раньше здесь стоял
    # commit(), а reserve_stock_for_order коммитила отдельно после него —
    # заказ мог существовать без резерва, а блокировки строк, взятые в
    # check_stock_before_order_creation, снимались до того, как резерв
    # применён, что и открывало окно для гонки.
    await db.flush()
    await reserve_stock_for_order(db, order.id)
    await db.commit()

    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse)
        )
        .where(Order.id == order.id)
    )
    return result.scalar_one()


async def get_orders(
    db: AsyncSession,
    current_user: User,
    skip: int = 0,
    limit: int = 10,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    manager_id: Optional[int] = None,
    status_id: Optional[int] = None,
    customer_name: Optional[str] = None,
):
    query = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse),
        )
        .order_by(Order.id.desc())
        .offset(skip)
        .limit(limit)
    )

    filters = []

    if not await user_is_admin(current_user, db):
        filters.append(Order.user_id == current_user.id)

        cancelled_status_result = await db.execute(
            select(OrderStatus.id).where(OrderStatus.name == "Отменен")
        )
        cancelled_status_id = cancelled_status_result.scalar_one_or_none()
        if cancelled_status_id is not None:
            filters.append(Order.status_id != cancelled_status_id)

    else:
        if manager_id:
            filters.append(Order.user_id == manager_id)

    if status_id:
        filters.append(Order.status_id == status_id)

    if customer_name:
        filters.append(func.lower(Customer.name).ilike(f"%{customer_name.lower()}%"))

    if date_from:
        # Начало дня — включительно с 00:00:00.
        filters.append(Order.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))

    if date_to:
        # Конец дня — включительно по 23:59:59.999999, иначе весь день выпадает из выборки.
        filters.append(Order.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    # Соединение с клиентом нужно ТОЛЬКО для фильтра по его имени. Раньше
    # здесь стоял безусловный внутренний join при любом непустом filters, а
    # для не-админа фильтр есть всегда (по user_id) — из-за чего заказы с
    # customer_id = NULL пропадали из списка целиком. Именно такие заказы
    # остаются после удаления клиента (FK ondelete="SET NULL"), то есть
    # сохранённые намеренно данные были недоступны в интерфейсе.
    if customer_name:
        query = query.join(Order.customer)

    if filters:
        query = query.where(*filters)

    result = await db.execute(query)
    return result.scalars().all()


async def get_export_rows(
    db: AsyncSession,
    current_user: User,
    *,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    manager_id: Optional[int] = None,
    status_id: Optional[int] = None,
    customer_name: Optional[str] = None,
) -> list[dict]:
    """Заказы для экспорта в Excel — одна строка на заказ (сводно, без
    разворачивания по позициям). Те же фильтры и то же ограничение доступа
    (не-админ видит только свои неотменённые заказы), что и в get_orders,
    без пагинации."""
    query = (
        select(Order)
        .options(
            selectinload(Order.items),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.branch),
        )
        .order_by(Order.id.desc())
    )

    filters = []

    if not await user_is_admin(current_user, db):
        filters.append(Order.user_id == current_user.id)

        cancelled_status_result = await db.execute(
            select(OrderStatus.id).where(OrderStatus.name == "Отменен")
        )
        cancelled_status_id = cancelled_status_result.scalar_one_or_none()
        if cancelled_status_id is not None:
            filters.append(Order.status_id != cancelled_status_id)
    else:
        if manager_id:
            filters.append(Order.user_id == manager_id)

    if status_id:
        filters.append(Order.status_id == status_id)

    if customer_name:
        filters.append(func.lower(Customer.name).ilike(f"%{customer_name.lower()}%"))

    if date_from:
        filters.append(Order.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))

    if date_to:
        filters.append(Order.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))

    if filters:
        query = query.join(Order.customer).where(*filters)

    result = await db.execute(query)
    orders = result.scalars().unique().all()

    rows = []
    for order in orders:
        rows.append({
            "id": order.id,
            "created_at": order.created_at,
            "customer_name": order.customer.name if order.customer else "",
            "manager_name": order.user.full_name if order.user else "",
            "status_name": order.status.name if order.status else "",
            "payment_method": order.payment_method.name if order.payment_method else "",
            "items_count": len(order.items),
            "total_price": order.finalized_total_price if order.finalized_total_price is not None else order.total_price,
            "delivery_date": order.delivery_date,
            "delivery_address": order.delivery_address,
            "branch_name": order.branch.name if order.branch else "",
        })
    return rows


async def confirm_order(
    db: AsyncSession,
    order_id: int,
    confirmed: bool,
    current_user: User
) -> Optional[Order]:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse).joinedload(Warehouse.branch),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        return None
    
    if (
        not await user_is_admin(current_user, db)
        and order.warehouse
        and current_user.branch_id is not None
        and order.warehouse.branch_id != current_user.branch_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Нельзя подтвердить заказ в другом филиале"
        )

    if order.confirmed and not confirmed:
        await restore_stock_for_order(db, order.id)
        await reserve_stock_for_order(db, order.id)  # заказ снова ожидает — резервируем обратно
        for item in order.items:
            await create_stock_log(db, StockLogCreate(
                product_id=item.product_id,
                warehouse_id=order.warehouse_id,
                order_id=order.id,
                quantity=item.quantity,
                type="return",
                note=f"Отмена подтверждения заказа #{order.id}",
                created_by=current_user.id,
            ))

    if confirmed and not order.confirmed:
        await deduct_stock_for_order(db, order)
        for item in order.items:
            await create_stock_log(db, StockLogCreate(
                product_id=item.product_id,
                warehouse_id=order.warehouse_id,
                order_id=order.id,
                quantity=item.quantity,
                type="outgoing",
                note=f"Подтверждение заказа #{order.id}",
                created_by=current_user.id,
            ))

    order.confirmed = confirmed
    order.confirmed_at = datetime.now(timezone.utc) if confirmed else None

    if confirmed and order.finalized_total_price is None:
        order.finalized_total_price = order.total_price
    if not confirmed:
        order.finalized_total_price = None

    if confirmed:
        await history_repo.add_entry(db, order_id, "confirmed", "Заказ подтверждён", user_id=current_user.id)
    else:
        await history_repo.add_entry(db, order_id, "unconfirmed", "Подтверждение снято", user_id=current_user.id)

    await db.commit()

    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse).joinedload(Warehouse.branch),
        )
        .where(Order.id == order_id)
    )
    return result.scalar_one()


async def update_order_status(
    db: AsyncSession,
    order_id: int,
    status_id: int,
    current_user: User,
    cancellation_reason: Optional[str] = None
) -> Optional[Order]:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    cancelled_status_result = await db.execute(
        select(OrderStatus.id).where(OrderStatus.name == "Отменен")
    )
    cancelled_status_id = cancelled_status_result.scalar_one_or_none()

    confirmed_status_result = await db.execute(
        select(OrderStatus.id).where(OrderStatus.name == "Подтверждён")
    )
    confirmed_status_id = confirmed_status_result.scalar_one_or_none()

    if status_id == cancelled_status_id:
        if not await user_is_admin(current_user, db) and order.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Нет доступа к отмене заказа")
        if not cancellation_reason:
            raise HTTPException(status_code=400, detail="Укажите причину отмены")
        order.cancelled_at = datetime.now(timezone.utc)
        order.cancellation_reason = cancellation_reason
        if order.finalized_total_price is None:
            order.finalized_total_price = order.total_price
        if order.confirmed:
            await restore_stock_for_order(db, order.id)
            for item in order.items:
                await create_stock_log(db, StockLogCreate(
                    product_id=item.product_id,
                    warehouse_id=order.warehouse_id,
                    order_id=order.id,
                    quantity=item.quantity,
                    type="return",
                    note=f"Отмена заказа #{order.id}: {cancellation_reason}",
                    created_by=current_user.id,
                ))
        else:
            await release_stock_reservation(db, order.id)

    if status_id == confirmed_status_id:
        if order.finalized_total_price is None:
            order.finalized_total_price = order.total_price

    old_status_name = order.status.name if order.status else "—"
    order.status_id = status_id

    new_status_result = await db.execute(select(OrderStatus.name).where(OrderStatus.id == status_id))
    new_status_name = new_status_result.scalar_one_or_none() or str(status_id)

    if status_id == cancelled_status_id:
        desc = f"Заказ отменён. Причина: {cancellation_reason}"
    else:
        desc = f"Статус изменён: «{old_status_name}» → «{new_status_name}»"
    await history_repo.add_entry(db, order_id, "status_changed", desc, user_id=current_user.id)

    await db.commit()

    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            joinedload(Order.customer),
            joinedload(Order.user),
            selectinload(Order.payment_method),
            joinedload(Order.status),
            joinedload(Order.warehouse),
        )
        .where(Order.id == order_id)
    )
    return result.scalar_one()


async def delete_order(db: AsyncSession, order_id: int) -> None:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.confirmed:
        await restore_stock_for_order(db, order.id)
        for item in order.items:
            await create_stock_log(db, StockLogCreate(
                product_id=item.product_id,
                warehouse_id=order.warehouse_id,
                order_id=order.id,
                quantity=item.quantity,
                type="return",
                note=f"Удаление подтверждённого заказа #{order.id}"
            ))
    else:
        await release_stock_reservation(db, order.id)

    await db.delete(order)
    await db.commit()