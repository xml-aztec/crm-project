import { describe, expect, it } from 'vitest';

import type { EditableOrderItem } from './orderItems';
import { validateOrder, type OrderDraft } from './orderValidation';

const goodItem: EditableOrderItem = {
  product_id: 1,
  quantity: 2,
  unit_price: 100,
  final_price: 200,
};

const draft = (over: Partial<OrderDraft> = {}): OrderDraft => ({
  customer_id: '5',
  warehouse_id: '2',
  items: [goodItem],
  ...over,
});

describe('validateOrder', () => {
  it('на корректном заказе не находит ошибок', () => {
    expect(validateOrder(draft())).toEqual([]);
  });

  it('требует клиента, склад и хотя бы один товар', () => {
    const errors = validateOrder(draft({ customer_id: '', warehouse_id: '', items: [] }));
    expect(errors).toContain('Не выбран клиент');
    expect(errors).toContain('Не выбран склад');
    expect(errors).toContain('Не добавлены товары в заказ');
  });

  it('отвергает нулевые количество и цену с номером позиции', () => {
    const errors = validateOrder(
      draft({ items: [{ ...goodItem, quantity: 0, unit_price: 0, final_price: 0 }] }),
    );
    expect(errors).toContain('Товар 1: некорректное количество');
    expect(errors).toContain('Товар 1: некорректная цена за единицу');
    expect(errors).toContain('Товар 1: некорректная общая стоимость');
  });

  it('требует срок рассрочки только там, где способ оплаты её допускает', () => {
    const methods = [{ id: 3, max_months: 12 }];

    const withoutMonths = validateOrder(
      draft({ payment_method_id: 3, installment_months: null }), methods);
    expect(withoutMonths).toContain('Не указано количество месяцев рассрочки');

    const tooMany = validateOrder(
      draft({ payment_method_id: 3, installment_months: 24 }), methods);
    expect(tooMany).toContain('Максимальное количество месяцев рассрочки: 12');

    const fine = validateOrder(
      draft({ payment_method_id: 3, installment_months: 6 }), methods);
    expect(fine).toEqual([]);
  });

  it('не спрашивает про рассрочку у способа оплаты без неё', () => {
    const methods = [{ id: 4, max_months: 0 }];
    const errors = validateOrder(draft({ payment_method_id: 4 }), methods);
    expect(errors).toEqual([]);
  });

  it('не пускает дату доставки в прошлом, но принимает будущую', () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    expect(
      validateOrder(draft({ delivery_date: past.toISOString().slice(0, 10) })),
    ).toContain('Дата доставки не может быть в прошлом');

    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(
      validateOrder(draft({ delivery_date: future.toISOString().slice(0, 10) })),
    ).toEqual([]);
  });

  it('требует положительную сумму заказа', () => {
    const errors = validateOrder(
      draft({ items: [{ ...goodItem, final_price: 0 }] }),
    );
    expect(errors).toContain('Общая сумма заказа должна быть больше 0');
  });
});
