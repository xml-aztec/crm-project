/**
 * Расчёт стоимости позиций заказа — одна реализация на весь фронтенд.
 *
 * Раньше формула `unit_price * quantity` была продублирована в
 * CreateOrderPage.tsx (строки 161, 190, 201) и OrderForm.tsx (строка 110),
 * плюс в каждом из файлов свой reduce для итога по заказу. Две независимые
 * копии одной денежной формулы — это ровно тот случай, когда правка в одном
 * месте молча расходится с другим.
 *
 * ВАЖНО про источник истины: с закрытием находки H3 цену позиции считает
 * СЕРВЕР по каталогу (backend/app/utils/orders.py::price_order_item), а
 * присланные клиентом unit_price/final_price игнорируются. Функции ниже
 * нужны только для того, чтобы показать пользователю сумму до отправки
 * формы, и обязаны повторять серверную формулу один в один — иначе на
 * экране будет одно число, а в созданном заказе другое.
 */

/** Позиция в том виде, в каком её держат формы заказа. */
export interface PricedOrderItem {
  quantity: number;
  unit_price: number;
  final_price: number;
}

/** Итог по строке: цена за единицу × количество, со скидкой в процентах. */
export function calculateLineTotal(
  unitPrice: number,
  quantity: number,
  discountPercent = 0,
): number {
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
  const safeDiscount = Math.min(Math.max(discountPercent || 0, 0), 100);

  const effectiveUnitPrice = safeUnitPrice * (1 - safeDiscount / 100);
  // Округление до копеек — так же, как quantize(Decimal("0.01")) на сервере.
  return Math.round(effectiveUnitPrice * safeQuantity * 100) / 100;
}

/**
 * Скидка в процентах, эквивалентная введённой вручную цене за единицу.
 *
 * Формы позволяют задать цену за штуку, а сервер принимает только скидку от
 * каталожной цены — этот перевод и есть граница между двумя представлениями.
 */
export function discountPercentFromUnitPrice(
  catalogPrice: number,
  enteredUnitPrice: number,
): number {
  if (!Number.isFinite(catalogPrice) || catalogPrice <= 0) return 0;
  if (!Number.isFinite(enteredUnitPrice) || enteredUnitPrice >= catalogPrice) return 0;
  const raw = ((catalogPrice - enteredUnitPrice) / catalogPrice) * 100;
  return Math.min(Math.max(Math.round(raw * 100) / 100, 0), 100);
}

/** Сумма заказа по позициям (без наценки способа оплаты — её считает сервер). */
export function calculateOrderTotal(items: readonly PricedOrderItem[]): number {
  return items.reduce((total, item) => total + (item.final_price || 0), 0);
}
