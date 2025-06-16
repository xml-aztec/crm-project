from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.order import Order

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

    # 2. Применение наценки, если есть
    if order.payment_method and order.payment_method.surcharge_percent:
        surcharge = Decimal(order.payment_method.surcharge_percent) / Decimal("100")
        base_total += base_total * surcharge

    # 3. Округление
    order.total_price = base_total.quantize(Decimal("0.01"))

    # 4. Сохранение
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return order.total_price