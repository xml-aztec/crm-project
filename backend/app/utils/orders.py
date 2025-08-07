from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.order import Order
from app.models.payment_method import PaymentMethod

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