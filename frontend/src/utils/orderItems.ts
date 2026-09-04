import { calculateLineTotal, type PricedOrderItem } from './orderPricing';

/**
 * Операции над списком позиций заказа — чистые функции без состояния.
 *
 * Раньше этот код жил внутри CreateOrderPage.tsx (838 строк) и частично
 * повторялся в OrderForm.tsx (710 строк): добавление товара, изменение
 * количества и цены были расписаны прямо в обработчиках, вперемешку с
 * управлением подсказками, фокусом полей и версткой. Проверить их можно было
 * только через рендер всей страницы.
 *
 * Функции возвращают НОВЫЙ массив и ничего не мутируют, поэтому подставляются
 * прямо в setState: `setOrderData(prev => ({ ...prev, items: addItem(...) }))`.
 */

/** Позиция в том виде, в каком её держат формы заказа. */
export interface EditableOrderItem extends PricedOrderItem {
  product_id: number;
}

/** Минимум, который нужен от товара каталога, чтобы добавить его в заказ. */
export interface AddableProduct {
  id: number;
  price: number;
}

/**
 * Добавляет товар. Если он уже в заказе — увеличивает количество на единицу,
 * а не создаёт вторую строку с тем же товаром.
 */
export function addItem(
  items: readonly EditableOrderItem[],
  product: AddableProduct,
): EditableOrderItem[] {
  const existing = items.find((item) => item.product_id === product.id);

  if (existing) {
    return items.map((item) =>
      item.product_id === product.id
        ? {
            ...item,
            quantity: item.quantity + 1,
            final_price: calculateLineTotal(item.unit_price, item.quantity + 1),
          }
        : item,
    );
  }

  return [
    ...items,
    {
      product_id: product.id,
      quantity: 1,
      unit_price: product.price,
      final_price: calculateLineTotal(product.price, 1),
    },
  ];
}

/**
 * Меняет количество позиции.
 *
 * Количество не опускается ниже единицы: убрать товар из заказа можно только
 * явным действием (removeItem), иначе случайный ноль в поле ввода молча
 * удалял бы строку.
 */
export function setItemQuantity(
  items: readonly EditableOrderItem[],
  productId: number,
  quantity: number,
): EditableOrderItem[] {
  const safeQuantity = Math.max(1, Math.floor(quantity) || 1);

  return items.map((item) =>
    item.product_id === productId
      ? {
          ...item,
          quantity: safeQuantity,
          final_price: calculateLineTotal(item.unit_price, safeQuantity),
        }
      : item,
  );
}

/**
 * Меняет цену за единицу и пересчитывает итог строки.
 *
 * Важно: сервер эту цену не примет как есть — он считает стоимость по
 * каталогу и принимает отклонение только как ограниченную скидку
 * (backend/app/utils/orders.py::price_order_item). Здесь значение нужно лишь
 * для того, чтобы пользователь видел сумму до отправки формы.
 */
export function setItemUnitPrice(
  items: readonly EditableOrderItem[],
  productId: number,
  unitPrice: number,
): EditableOrderItem[] {
  return items.map((item) =>
    item.product_id === productId
      ? {
          ...item,
          unit_price: unitPrice,
          final_price: calculateLineTotal(unitPrice, item.quantity),
        }
      : item,
  );
}

/** Убирает позицию из заказа. */
export function removeItem(
  items: readonly EditableOrderItem[],
  productId: number,
): EditableOrderItem[] {
  return items.filter((item) => item.product_id !== productId);
}
