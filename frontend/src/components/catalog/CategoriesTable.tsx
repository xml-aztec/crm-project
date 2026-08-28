import { useState } from 'react';
import {
  useGetCategoriesPaginatedQuery,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
  useBulkDeleteCategoriesMutation,
  useBulkSetCategoriesStatusMutation,
} from '../../store/api/catalogApi';
import { Category, BulkActionResult } from '../../types/catalog';
import { useTableUrlState } from '../../hooks/useTableUrlState';
import EntityTable from './EntityTable';
import CatalogSearchInput from './CatalogSearchInput';
import Button from '../ui/button/Button';

interface CategoriesTableProps {
  onEdit?: (category: Category) => void;
}

const CategoryIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
  </svg>
);

const PAGE_SIZE = 20;

export default function CategoriesTable({ onEdit }: CategoriesTableProps) {
  const { page, search, sortBy, sortOrder, setPage, setSearch, setSort } = useTableUrlState({
    prefix: 'cat',
    defaultSortBy: 'name',
  });

  const { data, isLoading, isFetching, error } = useGetCategoriesPaginatedQuery({
    search: search || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: PAGE_SIZE,
  });

  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteCategoriesMutation();
  const [bulkSetStatus, { isLoading: isBulkUpdating }] = useBulkSetCategoriesStatusMutation();

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
      icon={CategoryIcon}
      theme="blue"
      loadingText="Загрузка категорий..."
      errorText="Не удалось загрузить список категорий"
      emptyTitle={search ? 'Ничего не найдено' : 'Категории не найдены'}
      emptyDescription={search ? 'Попробуйте изменить поисковый запрос' : 'Создайте первую категорию товаров для организации вашего каталога'}
      nameColumnLabel="Категория"
      deleteModalTitle="Удалить категорию?"
      showProductsCount
      showCreatedAt
      sort={{ sortBy, sortOrder, onChange: (column) => setSort(column, sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc') }}
      onEdit={onEdit}
      onDelete={async (category) => {
        await deleteCategory(category.id).unwrap();
      }}
      deleteWarning={(category) => {
        const parts: string[] = [];
        if (category.products_count > 0) parts.push(`${category.products_count} товар(ов) останутся без категории`);
        if (category.subcategories_count > 0) parts.push(`${category.subcategories_count} подкатегория(й) будут удалены вместе с категорией`);
        return parts.length ? parts.join('. ') + '.' : null;
      }}
      onToggleActive={async (category, next) => {
        await updateCategory({ id: category.id, data: { is_active: next } }).unwrap();
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
          <CatalogSearchInput value={search} onChange={setSearch} placeholder="Поиск по названию категории..." />
          {bulkResult && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start justify-between gap-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Удалено: {bulkResult.deleted.length}.
                {bulkResult.skipped.length > 0 && ` Пропущено (есть товары/подкатегории): ${bulkResult.skipped.length}.`}
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
