/**
 * Сортировка строк складских остатков.
 *
 * Одна и та же реализация была расписана дважды: в
 * `pages/stock/StockManagement.tsx` (613 строк) и
 * `pages/warehouse/WarehouseInventory.tsx` (769 строк), с точностью до имён
 * полей сортировки ('product_name' против 'name', 'updated_at' против
 * 'updated'). Обе копии внутри useMemo, обе непроверяемы иначе как через
 * рендер страницы целиком.
 */

/** Минимум, который нужен от строки остатка для сортировки. */
export interface SortableStockRow {
  product_id: number;
  warehouse_id?: number;
  quantity: number;
  updated_at: string;
}

/** Канонические поля сортировки. Страницы отображают на них свои названия. */
export type StockSortField = 'product_name' | 'warehouse_name' | 'quantity' | 'updated_at';

export type SortOrder = 'asc' | 'desc';

export interface StockSortLookups {
  productName: (productId: number) => string;
  warehouseName?: (warehouseId: number | undefined) => string;
}

function compare(
  a: SortableStockRow,
  b: SortableStockRow,
  field: StockSortField,
  lookups: StockSortLookups,
): number {
  switch (field) {
    case 'product_name':
      return lookups.productName(a.product_id).localeCompare(lookups.productName(b.product_id));
    case 'warehouse_name': {
      const name = lookups.warehouseName ?? (() => '');
      return name(a.warehouse_id).localeCompare(name(b.warehouse_id));
    }
    case 'quantity':
      return a.quantity - b.quantity;
    case 'updated_at':
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    default:
      return 0;
  }
}

/** Возвращает НОВЫЙ отсортированный массив; исходный не мутируется. */
export function sortStockRows<T extends SortableStockRow>(
  rows: readonly T[],
  field: StockSortField,
  order: SortOrder,
  lookups: StockSortLookups,
): T[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const result = compare(a, b, field, lookups);
    return order === 'desc' ? -result : result;
  });
  return sorted;
}

/**
 * Строит функцию поиска названия по списку справочника.
 *
 * Обе страницы делали `list.find(x => x.id === id)?.name || ''` прямо в
 * компараторе — то есть линейный поиск на каждое сравнение, O(n log n · m).
 * Здесь справочник один раз сворачивается в Map.
 */
export function nameLookup(
  entries: readonly { id: number; name: string }[],
): (id: number | undefined) => string {
  const byId = new Map(entries.map((entry) => [entry.id, entry.name]));
  return (id) => (id === undefined ? '' : byId.get(id) ?? '');
}
