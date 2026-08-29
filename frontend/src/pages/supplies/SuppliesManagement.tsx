import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  useGetSuppliesQuery,
  useDeleteSupplyMutation,
} from '../../store/api/suppliesApi';
import { useGetSuppliersQuery } from '../../store/api/suppliersApi';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import { useTableUrlState } from '../../hooks/useTableUrlState';
import Button from '../../components/ui/button/Button';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import { FilterDatePicker } from '../../components/form/DatePickerVariants';
import Select from '../../components/form/Select';
import Label from '../../components/form/Label';
import CatalogSearchInput from '../../components/catalog/CatalogSearchInput';
import Pagination from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/dateUtils';

const PAGE_SIZE = 20;

interface SupplyFilterValues extends Record<string, string> {
  warehouse_id: string;
  supplier_id: string;
  date_from: string;
  date_to: string;
}

const SuppliesManagement: React.FC = () => {
  const navigate = useNavigate();

  const { page, search, filters, setPage, setSearch, setFilter, reset } = useTableUrlState<SupplyFilterValues>({
    prefix: 'supply',
    defaultSortBy: 'created_at',
    defaultFilters: {
      warehouse_id: '',
      supplier_id: '',
      date_from: '',
      date_to: '',
    },
  });

  const [supplyToDelete, setSupplyToDelete] = useState<any>(null);

  // API запросы
  const {
    data: suppliesResponse,
    isLoading: suppliesLoading,
    isFetching,
    error: suppliesError,
    refetch
  } = useGetSuppliesQuery({
    warehouse_id: filters.warehouse_id ? Number(filters.warehouse_id) : undefined,
    supplier_id: filters.supplier_id ? Number(filters.supplier_id) : undefined,
    search: search || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [deleteSupply, { isLoading: isDeleting }] = useDeleteSupplyMutation();

  // Данные поставок
  const supplies = suppliesResponse?.items || [];
  const totalSupplies = suppliesResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalSupplies / PAGE_SIZE));

  const warehouseOptions = React.useMemo(() =>
    warehouses.map(warehouse => ({
      value: warehouse.id.toString(),
      label: warehouse.name
    }))
  , [warehouses]);

  const supplierOptions = React.useMemo(() =>
    suppliers.map(supplier => ({
      value: supplier.id.toString(),
      label: supplier.name
    }))
  , [suppliers]);

  const handleDeleteSupply = useCallback(async () => {
    if (!supplyToDelete) return;

    try {
      await deleteSupply(supplyToDelete.id).unwrap();
      setSupplyToDelete(null);
    } catch (error) {
      console.error('Ошибка при удалении поставки:', error);
    }
  }, [supplyToDelete, deleteSupply]);

  const hasActiveFilters = !!search || !!filters.warehouse_id || !!filters.supplier_id || !!filters.date_from || !!filters.date_to;

  // Вычисление общей стоимости поставки
  const calculateSupplyTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  // Loading состояние
  if (suppliesLoading && supplies.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  // Error состояние
  if (suppliesError) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Не удалось загрузить список поставок
            </p>
            <Button onClick={() => refetch()}>
              Попробовать снова
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Управление поставками
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Просмотр и управление поставками товаров от поставщиков
          </p>
        </div>

        <Button onClick={() => navigate('/supplies/create')}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Создать поставку
        </Button>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Поиск по поставщику */}
          <div>
            <Label>Поиск</Label>
            <CatalogSearchInput value={search} onChange={setSearch} placeholder="Поиск по поставщику..." />
          </div>

          {/* Склад */}
          <div>
            <Label>Склад</Label>
            <Select
              key={filters.warehouse_id}
              options={warehouseOptions}
              defaultValue={filters.warehouse_id}
              onChange={(value) => setFilter('warehouse_id', value)}
              placeholder="Все склады"
            />
          </div>

          {/* Поставщик */}
          <div>
            <Label>Поставщик</Label>
            <Select
              key={filters.supplier_id}
              options={supplierOptions}
              defaultValue={filters.supplier_id}
              onChange={(value) => setFilter('supplier_id', value)}
              placeholder="Все поставщики"
            />
          </div>

          {/* Дата от */}
          <div>
            <Label>Дата от</Label>
            <FilterDatePicker
              id="supplies-date-from"
              placeholder="Дата от"
              value={filters.date_from}
              onChange={(_dates, dateStr) => setFilter('date_from', dateStr)}
            />
          </div>

          {/* Дата до */}
          <div>
            <Label>Дата до</Label>
            <FilterDatePicker
              id="supplies-date-to"
              placeholder="Дата до"
              value={filters.date_to}
              onChange={(_dates, dateStr) => setFilter('date_to', dateStr)}
            />
          </div>
        </div>

        {/* Кнопка очистки фильтров */}
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={reset}>
              Очистить фильтры
            </Button>
          </div>
        )}
      </div>

      {/* Таблица поставок */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-200 dark:bg-blue-800 overflow-hidden z-20">
            <div className="h-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
          </div>
        )}
        {supplies.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0l-2-2m0 0l-2 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Поставки не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {hasActiveFilters
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'Создайте первую поставку'
              }
            </p>
            <Button onClick={() => navigate('/supplies/create')}>
              Создать поставку
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Поставщик
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Склад
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Дата поставки
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Позиций
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Создал
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${isFetching ? 'opacity-70' : ''}`}>
                {supplies.map((supply) => (
                  <tr key={supply.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{supply.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {supply.supplier?.name ?? '—'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {supply.supplier?.contact_person}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {supply.warehouse.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDateTime(supply.delivered_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {supply.items.length} поз.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {calculateSupplyTotal(supply.items).toLocaleString()} сом
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {supply.created_user?.full_name ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/supplies/${supply.id}`)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Просмотр"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => navigate(`/supplies/${supply.id}/edit`)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Редактировать"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => setSupplyToDelete(supply)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Удалить"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {suppliesResponse && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <Pagination page={page} totalPages={totalPages} total={totalSupplies} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Модал подтверждения удаления */}
      <DeleteConfirmModal
        isOpen={!!supplyToDelete}
        title="Удалить поставку"
        itemName={supplyToDelete ? `#${supplyToDelete.id} от ${supplyToDelete.supplier?.name}` : ''}
        confirmText="Удалить"
        isLoading={isDeleting}
        onConfirm={handleDeleteSupply}
        onClose={() => setSupplyToDelete(null)}
      />
    </div>
  );
};

export default SuppliesManagement;
