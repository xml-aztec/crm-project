import { describe, expect, it } from 'vitest';

import {
  addItem,
  removeItem,
  setItemQuantity,
  setItemUnitPrice,
  type EditableOrderItem,
} from './orderItems';

const item = (over: Partial<EditableOrderItem> = {}): EditableOrderItem => ({
  product_id: 1,
  quantity: 2,
  unit_price: 100,
  final_price: 200,
  ...over,
});

describe('addItem', () => {
  it('добавляет новый товар с количеством 1', () => {
    const result = addItem([], { id: 7, price: 250 });
    expect(result).toEqual([
      { product_id: 7, quantity: 1, unit_price: 250, final_price: 250 },
    ]);
  });

  it('не создаёт вторую строку для уже добавленного товара, а увеличивает количество', () => {
    const result = addItem([item({ product_id: 7, quantity: 2, unit_price: 250, final_price: 500 })], {
      id: 7,
      price: 250,
    });
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
    expect(result[0].final_price).toBe(750);
  });

  it('не трогает другие позиции', () => {
    const existing = [item({ product_id: 1 }), item({ product_id: 2, unit_price: 50, final_price: 100 })];
    const result = addItem(existing, { id: 2, price: 50 });
    expect(result[0]).toEqual(existing[0]);
    expect(result[1].quantity).toBe(3);
  });

  it('не мутирует исходный массив', () => {
    const existing = [item({ product_id: 7 })];
    const snapshot = JSON.stringify(existing);
    addItem(existing, { id: 7, price: 100 });
    expect(JSON.stringify(existing)).toBe(snapshot);
  });
});

describe('setItemQuantity', () => {
  it('пересчитывает итог строки', () => {
    const result = setItemQuantity([item({ unit_price: 100 })], 1, 5);
    expect(result[0].quantity).toBe(5);
    expect(result[0].final_price).toBe(500);
  });

  it('не опускает количество ниже единицы: позиция удаляется только крестиком', () => {
    expect(setItemQuantity([item()], 1, 0)[0].quantity).toBe(1);
    expect(setItemQuantity([item()], 1, -4)[0].quantity).toBe(1);
  });

  it('выдерживает нечисловой ввод из поля количества', () => {
    expect(setItemQuantity([item()], 1, Number.NaN)[0].quantity).toBe(1);
  });

  it('игнорирует позиции с другим товаром', () => {
    const items = [item({ product_id: 1 }), item({ product_id: 2 })];
    const result = setItemQuantity(items, 2, 9);
    expect(result[0].quantity).toBe(2);
    expect(result[1].quantity).toBe(9);
  });
});

describe('setItemUnitPrice', () => {
  it('меняет цену за единицу и итог строки согласованно', () => {
    const result = setItemUnitPrice([item({ quantity: 3, unit_price: 100, final_price: 300 })], 1, 80);
    expect(result[0].unit_price).toBe(80);
    expect(result[0].final_price).toBe(240);
  });
});

describe('removeItem', () => {
  it('убирает нужную позицию и оставляет остальные', () => {
    const items = [item({ product_id: 1 }), item({ product_id: 2 })];
    const result = removeItem(items, 1);
    expect(result).toHaveLength(1);
    expect(result[0].product_id).toBe(2);
  });

  it('на отсутствующем товаре ничего не меняет', () => {
    const items = [item({ product_id: 1 })];
    expect(removeItem(items, 99)).toHaveLength(1);
  });
});
