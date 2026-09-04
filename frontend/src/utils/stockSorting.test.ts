import { describe, expect, it } from 'vitest';

import { nameLookup, sortStockRows, type SortableStockRow } from './stockSorting';

const rows: SortableStockRow[] = [
  { product_id: 2, warehouse_id: 20, quantity: 5, updated_at: '2026-03-01T00:00:00Z' },
  { product_id: 1, warehouse_id: 10, quantity: 30, updated_at: '2026-01-01T00:00:00Z' },
  { product_id: 3, warehouse_id: 30, quantity: 12, updated_at: '2026-02-01T00:00:00Z' },
];

const lookups = {
  productName: nameLookup([
    { id: 1, name: 'Яблоко' },
    { id: 2, name: 'Банан' },
    { id: 3, name: 'Апельсин' },
  ]) as (id: number) => string,
  warehouseName: nameLookup([
    { id: 10, name: 'Центральный' },
    { id: 20, name: 'Автозапчасти' },
    { id: 30, name: 'Резервный' },
  ]),
};

const ids = (list: SortableStockRow[]) => list.map((r) => r.product_id);

describe('sortStockRows', () => {
  it('сортирует по названию товара с учётом кириллицы', () => {
    expect(ids(sortStockRows(rows, 'product_name', 'asc', lookups))).toEqual([3, 2, 1]);
  });

  it('сортирует по названию склада', () => {
    // Автозапчасти -> Резервный -> Центральный
    expect(ids(sortStockRows(rows, 'warehouse_name', 'asc', lookups))).toEqual([2, 3, 1]);
  });

  it('сортирует по количеству', () => {
    expect(ids(sortStockRows(rows, 'quantity', 'asc', lookups))).toEqual([2, 3, 1]);
  });

  it('сортирует по дате обновления', () => {
    expect(ids(sortStockRows(rows, 'updated_at', 'asc', lookups))).toEqual([1, 3, 2]);
  });

  it('обратный порядок переворачивает результат', () => {
    const asc = ids(sortStockRows(rows, 'quantity', 'asc', lookups));
    const desc = ids(sortStockRows(rows, 'quantity', 'desc', lookups));
    expect(desc).toEqual([...asc].reverse());
  });

  it('не мутирует исходный массив', () => {
    const before = ids(rows);
    sortStockRows(rows, 'quantity', 'desc', lookups);
    expect(ids(rows)).toEqual(before);
  });

  it('выдерживает отсутствие справочника складов', () => {
    const result = sortStockRows(rows, 'warehouse_name', 'asc', {
      productName: lookups.productName,
    });
    expect(result).toHaveLength(3);
  });
});

describe('nameLookup', () => {
  it('находит название по идентификатору', () => {
    expect(nameLookup([{ id: 7, name: 'Склад' }])(7)).toBe('Склад');
  });

  it('возвращает пустую строку для неизвестного и пустого идентификатора', () => {
    const lookup = nameLookup([{ id: 7, name: 'Склад' }]);
    expect(lookup(99)).toBe('');
    expect(lookup(undefined)).toBe('');
  });
});
