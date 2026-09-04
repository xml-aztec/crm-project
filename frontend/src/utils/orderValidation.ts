import { getNowInBishkek } from './dateUtils';
import type { EditableOrderItem } from './orderItems';
import { calculateOrderTotal } from './orderPricing';

/**
 * Проверка заказа перед отправкой — чистая функция.
 *
 * Была методом внутри CreateOrderPage.tsx, где смешивалась с состоянием
 * подсказок, фокусом полей и разметкой, и проверить её можно было только
 * отрендерив страницу целиком. Здесь у неё нет ни состояния, ни зависимостей
 * от React.
 */

/** Способ оплаты в объёме, нужном для проверки рассрочки. */
export interface PaymentMethodForValidation {
  id: number;
  max_months?: number | null;
}

export interface OrderDraft {
  customer_id: string | number | null;
  warehouse_id: string | number | null;
  items: readonly EditableOrderItem[];
  delivery_date?: string | null;
  payment_method_id?: number | null;
  installment_months?: number | null;
}

export function validateOrder(
  order: OrderDraft,
  paymentMethods: readonly PaymentMethodForValidation[] = [],
): string[] {
  const errors: string[] = [];

  if (!order.customer_id) errors.push('Не выбран клиент');
  if (!order.warehouse_id) errors.push('Не выбран склад');
  if (order.items.length === 0) errors.push('Не добавлены товары в заказ');

  if (order.payment_method_id) {
    const method = paymentMethods.find((pm) => pm.id === order.payment_method_id);
    // Рассрочка проверяется только у способов оплаты, где она вообще есть
    // (max_months > 0) — иначе поле месяцев к ним не относится.
    if (method?.max_months && method.max_months > 0) {
      if (!order.installment_months || order.installment_months <= 0) {
        errors.push('Не указано количество месяцев рассрочки');
      }
      if (order.installment_months && order.installment_months > method.max_months) {
        errors.push(`Максимальное количество месяцев рассрочки: ${method.max_months}`);
      }
    }
  }

  order.items.forEach((item, index) => {
    if (item.quantity <= 0) errors.push(`Товар ${index + 1}: некорректное количество`);
    if (item.unit_price <= 0) errors.push(`Товар ${index + 1}: некорректная цена за единицу`);
    if (item.final_price <= 0) errors.push(`Товар ${index + 1}: некорректная общая стоимость`);
  });

  if (order.delivery_date) {
    const deliveryDate = new Date(order.delivery_date);
    // Сегодняшний день считается по бишкекскому времени (UTC+6), а не по
    // часовому поясу браузера: иначе у пользователя западнее заказ на
    // сегодня отклонялся бы как «в прошлом».
    const today = getNowInBishkek();
    today.setHours(0, 0, 0, 0);
    if (deliveryDate < today) errors.push('Дата доставки не может быть в прошлом');
  }

  if (calculateOrderTotal(order.items) <= 0) {
    errors.push('Общая сумма заказа должна быть больше 0');
  }

  return errors;
}
