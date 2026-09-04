import { describe, expect, it } from 'vitest';

import {
  calculateLineTotal,
  calculateOrderTotal,
  discountPercentFromUnitPrice,
} from './orderPricing';

/**
 * Расчёт стоимости позиции — единственное место на фронтенде, где считаются
 * деньги, и оно обязано совпадать с серверной формулой
 * (backend/app/utils/orders.py::price_order_item). Расхождение здесь означает,
 * что пользователь видит на экране одну сумму, а в заказе оказывается другая.
 */
describe('calculateLineTotal', () => {
  it('умножает цену за единицу на количество', () => {
    expect(calculateLineTotal(200, 5)).toBe(1000);
  });

  it('применяет скидку в процентах', () => {
    expect(calculateLineTotal(200, 5, 10)).toBe(900);
  });

  it('округляет до копеек, как quantize(0.01) на сервере', () => {
    // 33.333... * 3 = 99.999... -> 100.00
    expect(calculateLineTotal(33.333, 3)).toBe(100);
  });

  it('считает нулём некорректные количество и цену', () => {
    expect(calculateLineTotal(200, 0)).toBe(0);
    expect(calculateLineTotal(200, -3)).toBe(0);
    expect(calculateLineTotal(-200, 3)).toBe(0);
    expect(calculateLineTotal(Number.NaN, 3)).toBe(0);
  });

  it('зажимает скидку в диапазон 0–100', () => {
    expect(calculateLineTotal(200, 2, -50)).toBe(400);
    expect(calculateLineTotal(200, 2, 150)).toBe(0);
  });

  it('при скидке 100% даёт ноль, а не отрицательную сумму', () => {
    expect(calculateLineTotal(200, 4, 100)).toBe(0);
  });
});

describe('discountPercentFromUnitPrice', () => {
  it('переводит введённую вручную цену в скидку от каталожной', () => {
    expect(discountPercentFromUnitPrice(200, 180)).toBe(10);
    expect(discountPercentFromUnitPrice(200, 100)).toBe(50);
  });

  it('не даёт отрицательной скидки при цене выше каталожной', () => {
    expect(discountPercentFromUnitPrice(200, 250)).toBe(0);
  });

  it('возвращает ноль при некорректной каталожной цене', () => {
    expect(discountPercentFromUnitPrice(0, 100)).toBe(0);
    expect(discountPercentFromUnitPrice(Number.NaN, 100)).toBe(0);
  });

  it('согласован с calculateLineTotal в обе стороны', () => {
    const catalog = 200;
    const entered = 150;
    const discount = discountPercentFromUnitPrice(catalog, entered);
    // 3 штуки по 150 = 450, тем же должен быть расчёт через скидку.
    expect(calculateLineTotal(catalog, 3, discount)).toBe(entered * 3);
  });
});

describe('calculateOrderTotal', () => {
  it('складывает итоги строк', () => {
    expect(
      calculateOrderTotal([
        { quantity: 5, unit_price: 200, final_price: 1000 },
        { quantity: 2, unit_price: 50, final_price: 100 },
      ]),
    ).toBe(1100);
  });

  it('НЕ умножает final_price на количество повторно', () => {
    // Ровно та ошибка, что была в аналитике бэкенда (находка C2):
    // final_price уже содержит количество.
    const items = [{ quantity: 10, unit_price: 100, final_price: 1000 }];
    expect(calculateOrderTotal(items)).toBe(1000);
    expect(calculateOrderTotal(items)).not.toBe(10000);
  });

  it('на пустом списке даёт ноль', () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});
