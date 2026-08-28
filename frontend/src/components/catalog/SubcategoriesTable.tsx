import { useState } from 'react';
import {
  useGetSubcategoriesPaginatedQuery,
  useGetCategoriesQuery,
  useDeleteSubcategoryMutation,
  useUpdateSubcategoryMutation,
  useBulkDeleteSubcategoriesMutation,
  useBulkSetSubcategoriesStatusMutation,
} from '../../store/api/catalogApi';
import { Subcategory, BulkActionResult } from '../../types/catalog';
import { useTableUrlState } from '../../hooks/useTableUrlState';
import { useSearchParams } from 'react-router';
import EntityTable from './EntityTable';
import CatalogSearchInput from './CatalogSearchInput';
import SubcategoryTree from './SubcategoryTree';
import Button from '../ui/button/Button';
import Select from '../form/Select';

interface SubcategoriesTableProps {
  onEdit?: (subcategory: Subcategory) => void;
}

const SubcategoryIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const PAGE_SIZE = 20;

export default function SubcategoriesTable({ onEdit }: SubcategoriesTableProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get('sub_view') as 'table' | 'tree') || 'table';
  const setViewMode = (mode: 'table' | 'tree') =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (mode === 'table') next.delete('sub_view');
      else next.set('sub_view', mode);
      return next;
    }, { replace: true });

  const { page, search, sortBy, sortOrder, filters, setPage, setSearch, setSort, setFilter } = useTableUrlState({
    prefix: 'sub',
    defaultSortBy: 'name',
    defaultFilters: { category_id: '' },
  });

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data, isLoading, isFetching, error } = useGetSubcategoriesPaginatedQuery({
    search: search || undefined,
    category_id: filters.category_id ? Number(filters.category_id) : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: PAGE_SIZE,
  });

  const [deleteSubcategory, { isLoading: isDeleting }] = useDeleteSubcategoryMutation();
  const [updateSubcategory] = useUpdateSubcategoryMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteSubcategoriesMutation();
  const [bulkSetStatus, { isLoading: isBulkUpdating }] = useBulkSetSubcategoriesStatusMutation();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkActionResult | null>(null);

  const items = data?.items ?? [];
  const categoryOptions = categories.map((c) => ({ value: c.id.toString(), label: c.name }));
  const getCategoryName = (categoryId: number) => categories.find((c) => c.id === categoryId)?.name || `Категория #${categoryId}`;

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

  const viewToggle = (
    <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => setViewMode('table')}
        className={`px-3 py-1.5 ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
      >
        Таблица
      </button>
      <button
        type="button"
        onClick={() => setViewMode('tree')}
        className={`px-3 py-1.5 ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
      >
        Дерево
      </button>
    </div>
  );

  if (viewMode === 'tree') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{viewToggle}</div>
        <SubcategoryTree onEdit={onEdit} />
      </div>
    );
  }

  return (
    <EntityTable
      items={items}
      isLoading={isLoading || isFetching}
      error={error}
      isDeleting={isDeleting}
      icon={SubcategoryIcon}
      theme="purple"
      loadingText="Загрузка подкатегорий..."
      errorText="Не удалось загрузить список подкатегорий"
      emptyTitle={search || filters.category_id ? 'Ничего не найдено' : 'Подкатегории не найдены'}
      emptyDescription={search || filters.category_id ? 'Попробуйте изменить поиск или фильтр по категории' : 'Создайте подкатегории для лучшей организации товаров в каталоге'}
      nameColumnLabel="Подкатегория"
      deleteModalTitle="Удалить подкатегорию?"
      showProductsCount
      showCreatedAt
      sort={{ sortBy, sortOrder, onChange: (column) => setSort(column, sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc') }}
      extraColumn={{
        label: 'Родительская категория',
        render: (subcategory) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            {getCategoryName(subcategory.category_id)}
          </span>
        ),
      }}
      onEdit={onEdit}
      onDelete={async (subcategory) => {
        await deleteSubcategory(subcategory.id).unwrap();
      }}
      deleteWarning={(subcategory) =>
        subcategory.products_count > 0 ? `${subcategory.products_count} товар(ов) останутся без подкатегории.` : null
      }
      onToggleActive={async (subcategory, next) => {
        await updateSubcategory({ id: subcategory.id, data: { is_active: next } }).unwrap();
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
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <CatalogSearchInput value={search} onChange={setSearch} placeholder="Поиск по названию подкатегории..." className="flex-1" />
            <div className="sm:w-64">
              <Select
                key={filters.category_id}
                options={categoryOptions}
                defaultValue={filters.category_id}
                onChange={(value) => setFilter('category_id', value)}
                placeholder="Все категории"
              />
            </div>
            {viewToggle}
          </div>
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
