from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select

from app.models.order import Order
from app.models.payment_method import PaymentMethod


def order_counts_as_revenue():
    """Единственное определение «заказ учитывается в деньгах».

    Раньше это условие было записано как голое `Order.confirmed == True` в
    12 запросах analytics.py и в payroll.get_actual_sales — и ни один из них
    не исключал отменённые заказы. Флаг `confirmed` при отмене не сбрасывается
    (см. update_order_status: проставляется только cancelled_at), поэтому
    подтверждённый и затем отменённый заказ навсегда оставался в выручке
    компании, в KPI менеджера и в базе для расчёта его бонуса.

    Сбрасывать сам `confirmed` нельзя: на него завязано восстановление склада
    (`if order.confirmed` в update_order_status/delete_order) и `confirmed_at`,
    по которому payroll определяет период. Поэтому признак «отменён» проверяется
    отдельным полем, а условие вынесено сюда, чтобы не разъезжаться по вызовам.
    """
    return and_(Order.confirmed.is_(True), Order.cancelled_at.is_(None))

MAX_DISCOUNT_PERCENT = Decimal("100")


async def price_order_item(
    db: AsyncSession,
    product_id: int,
    quantity: int,
    discount_percent: Decimal | None = None,
) -> tuple[Decimal, Decimal]:
    """Единственное место, где определяется цена позиции заказа.

    Возвращает (unit_price, final_price). Обе величины считаются ЗДЕСЬ, на
    сервере: unit_price берётся из каталога, final_price — это unit_price *
    quantity со скидкой. Клиент не может прислать ни то, ни другое.

    Раньше OrderItemBase принимал unit_price и final_price от клиента и
    никак их не сверял: заказ на 500 000 сом можно было провести с
    final_price = 1, и это значение попадало и в сумму заказа, и в выручку,
    и в KPI. Отдельным следствием было то, что final_price мог не иметь
    никакого отношения к unit_price * quantity — при изменении количества
    позиции он вообще не пересчитывался.

    Скидка — единственный санкционированный способ отклониться от каталожной
    цены; её диапазон ограничен схемой (0..100), а право на неё проверяется
    вызывающим кодом (permission `orders.discount`).
    """
    from app.models.product import Product

    price = await db.scalar(select(Product.price).where(Product.id == product_id))
    if price is None:
        raise HTTPException(404, detail=f"Товар id={product_id} не найден")

    if quantity is None or quantity <= 0:
        raise HTTPException(400, detail="Количество должно быть больше нуля")

    # products.price пока Float (см. находку M1) — переводим через str, чтобы
    # не тащить в Decimal двоичный «хвост» вроде 199.99999999999997.
    unit_price = Decimal(str(price))

    discount = Decimal(discount_percent or 0)
    if discount < 0 or discount > MAX_DISCOUNT_PERCENT:
        raise HTTPException(400, detail="Скидка должна быть в диапазоне 0–100%")

    effective_unit = unit_price * (Decimal("1") - discount / Decimal("100"))
    final_price = (effective_unit * Decimal(quantity)).quantize(Decimal("0.01"))

    return unit_price.quantize(Decimal("0.01")), final_price


async def recalculate_order_total(order: Order, db: AsyncSession) -> Decimal:
    """
    Пересчитывает total_price заказа с учетом наценки способа оплаты.
    - Складывает final_price всех позиций
    - Добавляет наценку от способа оплаты (если есть)
    - Обновляет поле order.total_price
    """

    # 1. Сумма всех позиций
    base_total = Decimal("0.00")
    for item in order.items:
        if item.final_price:
            base_total += item.final_price

    # 2. Получение наценки (если есть)
    surcharge_percent = Decimal("0.00")
    if order.payment_method_id:
        result = await db.execute(
            select(PaymentMethod.surcharge_percent).where(PaymentMethod.id == order.payment_method_id)
        )
        surcharge_percent = result.scalar_one_or_none() or Decimal("0.00")

    # 3. Применение наценки
    surcharge = base_total * (surcharge_percent / Decimal("100"))
    total = base_total + surcharge

    # 4. Округление и сохранение
    order.total_price = total.quantize(Decimal("0.01"))
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return order.total_price