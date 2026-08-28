import { useState } from 'react';
import {
  useGetBrandsPaginatedQuery,
  useDeleteBrandMutation,
  useUpdateBrandMutation,
  useBulkDeleteBrandsMutation,
  useBulkSetBrandsStatusMutation,
} from '../../store/api/catalogApi';
import { Brand, BulkActionResult } from '../../types/catalog';
import { useTableUrlState } from '../../hooks/useTableUrlState';
import EntityTable from './EntityTable';
import CatalogSearchInput from './CatalogSearchInput';
import Button from '../ui/button/Button';

interface BrandsTableProps {
  onEdit?: (brand: Brand) => void;
}

const BrandIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const PAGE_SIZE = 20;

export default function BrandsTable({ onEdit }: BrandsTableProps) {
  const { page, search, sortBy, sortOrder, setPage, setSearch, setSort } = useTableUrlState({
    prefix: 'brand',
    defaultSortBy: 'name',
  });

  const { data, isLoading, isFetching, error } = useGetBrandsPaginatedQuery({
    search: search || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: PAGE_SIZE,
  });

  const [deleteBrand, { isLoading: isDeleting }] = useDeleteBrandMutation();
  const [updateBrand] = useUpdateBrandMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteBrandsMutation();
  const [bulkSetStatus, { isLoading: isBulkUpdating }] = useBulkSetBrandsStatusMutation();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkActionResult | null>(null);

  const items = data?.items ?? [];

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  };

  const handleBulkDelete = async () => {
    const result = await bulkDelete({ ids: Array.from(selectedIds) }).unwrap();
    setSelectedIds(new Set());
    setBulkResult(result);
  };

  const handleBulkStatus = async (is_active: boolean) => {
    await bulkSetStatus({ ids: Array.from(selectedIds), is_active }).unwrap();
    setSelectedIds(new Set());
  };

  return (
    <EntityTable
      items={items}
      isLoading={isLoading || isFetching}
      error={error}
      isDeleting={isDeleting}
      icon={BrandIcon}
      theme="orange"
      loadingText="Загрузка брендов..."
      errorText="Не удалось загрузить список брендов"
      emptyTitle={search ? 'Ничего не найдено' : 'Бренды не найдены'}
      emptyDescription={search ? 'Попробуйте изменить поисковый запрос' : 'Создайте бренды для лучшей организации товаров в каталоге'}
      nameColumnLabel="Бренд"
      deleteModalTitle="Удалить бренд?"
      showProductsCount
      showCreatedAt
      sort={{ sortBy, sortOrder, onChange: (column) => setSort(column, sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc') }}
      onEdit={onEdit}
      onDelete={async (brand) => {
        await deleteBrand(brand.id).unwrap();
      }}
      deleteWarning={(brand) => (brand.products_count > 0 ? `${brand.products_count} товар(ов) останутся без бренда.` : null)}
      onToggleActive={async (brand, next) => {
        await updateBrand({ id: brand.id, data: { is_active: next } }).unwrap();
      }}
      selection={{
        selectedIds,
        allSelected: items.length > 0 && selectedIds.size === items.length,
        onToggle: toggleSelect,
        onToggleAll: toggleSelectAll,
      }}
      bulkActionsSlot={
        <>
          <Button size="sm" variant="outline" disabled={isBulkUpdating} onClick={() => handleBulkStatus(true)}>
            Активировать
          </Button>
          <Button size="sm" variant="outline" disabled={isBulkUpdating} onClick={() => handleBulkStatus(false)}>
            Деактивировать
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBulkDeleting}
            className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600"
            onClick={handleBulkDelete}
          >
            Удалить выбранные
          </Button>
        </>
      }
      filtersSlot={
        <div className="mb-4 space-y-3">
          <CatalogSearchInput value={search} onChange={setSearch} placeholder="Поиск по названию бренда..." />
          {bulkResult && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start justify-between gap-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Удалено: {bulkResult.deleted.length}.
                {bulkResult.skipped.length > 0 && ` Пропущено (есть товары): ${bulkResult.skipped.length}.`}
              </p>
              <button onClick={() => setBulkResult(null)} className="text-amber-600 dark:text-amber-400 shrink-0">×</button>
            </div>
          )}
        </div>
      }
      pagination={
        data
          ? { page, totalPages: data.total_pages, total: data.total, onPageChange: setPage }
          : undefined
      }
    />
  );
}
