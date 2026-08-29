import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useGetStockLogsPaginatedQuery } from '../../store/api/stockLogsApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import { useTableUrlState } from '../../hooks/useTableUrlState';
import { FilterDatePicker } from '../../components/form/DatePickerVariants';
import Label from '../../components/form/Label';
import Button from '../../components/ui/button/Button';
import Pagination from '../../components/common/Pagination';
import CatalogSearchInput from '../../components/catalog/CatalogSearchInput';

const ITEMS_PER_PAGE = 20;

interface StockLogFilterValues extends Record<string, string> {
  product_id: string;
  warehouse_id: string;
  order_id: string;
  type: string;
  date_from: string;
  date_to: string;
}

export default function StockLogsPage() {
  const navigate = useNavigate();

  const { page, search, filters, setPage, setSearch, setFilter, reset } = useTableUrlState<StockLogFilterValues>({
    prefix: 'stocklog',
    defaultSortBy: 'created_at',
    defaultFilters: {
      product_id: '',
      warehouse_id: '',
      order_id: '',
      type: '',
      date_from: '',
      date_to: '',
    },
  });

  const queryParams = useMemo(() => ({
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
    warehouse_id: filters.warehouse_id ? Number(filters.warehouse_id) : undefined,
    order_id: filters.order_id ? Number(filters.order_id) : undefined,
    type: (filters.type || undefined) as 'incoming' | 'outgoing' | 'return' | 'adjust' | undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    page,
    page_size: ITEMS_PER_PAGE,
  }), [filters, page]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch
  } = useGetStockLogsPaginatedQuery(queryParams);

  const { data: products = [] } = useGetProductsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();

  const logs = useMemo(() => data?.items ?? [], [data]);

  // Локальный поиск по названию товара — работает в пределах загруженной страницы
  // (сервер фильтрует по product_id, а не по свободному тексту).
  const filteredStockLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const searchLower = search.toLowerCase();
    return logs.filter(log => {
      const product = products.find(p => p.id === log.product_id);
      return (product?.name || '').toLowerCase().includes(searchLower);
    });
  }, [logs, search, products]);

  const operationTypeOptions = [
    { value: 'incoming', label: 'Поступление' },
    { value: 'outgoing', label: 'Списание' },
    { value: 'return', label: 'Возврат' },
    { value: 'adjust', label: 'Корректировка' },
  ];

  const hasActiveFilters = !!search || Object.values(filters).some((v) => !!v);

  // Вспомогательные функции
  const getProductName = useCallback((productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || `Товар #${productId}`;
  }, [products]);

  const getWarehouseName = useCallback((warehouseId: number) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || `Склад #${warehouseId}`;
  }, [warehouses]);

  const formatLogType = useCallback((type: string) => {
    switch (type) {
      case 'incoming': return 'Поступление';
      case 'outgoing': return 'Списание';
      case 'return': return 'Возврат';
      case 'adjust': return 'Корректировка';
      default: return type;
    }
  }, []);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'incoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'outgoing':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'return':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'adjust':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'incoming':
        return <span className="text-blue-600 dark:text-blue-400">📦</span>;
      case 'outgoing':
        return <span className="text-red-600 dark:text-red-400">📤</span>;
      case 'return':
        return <span className="text-green-600 dark:text-green-400">↩️</span>;
      case 'adjust':
        return <span className="text-yellow-600 dark:text-yellow-400">⚖️</span>;
      default:
        return <span className="text-gray-600 dark:text-gray-400">📋</span>;
    }
  }, []);

  // Loading состояние
  if (isLoading && !logs.length) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-t border-gray-200 dark:border-gray-700">
                <div className="h-16 bg-gray-100 dark:bg-gray-800"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center py-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Не удалось загрузить логи движения товаров. Проверьте подключение к серверу.
            </p>
            <Button onClick={() => refetch()}>
              Обновить страницу
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Логи движения товаров
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            История всех операций со складскими остатками
          </p>
        </div>

        <Button onClick={() => navigate('/stock')}>
          Управление остатками
        </Button>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Первая строка - Поиск и Товар на всю ширину */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Поиск по названию товара (локальная фильтрация) */}
          <div>
            <Label>Поиск по названию товара</Label>
            <CatalogSearchInput value={search} onChange={setSearch} placeholder="Название товара..." />
          </div>

          {/* Товар (API фильтр) */}
          <div>
            <Label>Товар</Label>
            <select
              value={filters.product_id}
              onChange={(e) => setFilter('product_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все товары</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Вторая строка - остальные фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Склад (API фильтр) */}
          <div>
            <Label>Склад</Label>
            <select
              value={filters.warehouse_id}
              onChange={(e) => setFilter('warehouse_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все склады</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          {/* Тип операции (API фильтр) */}
          <div>
            <Label>Тип операции</Label>
            <select
              value={filters.type}
              onChange={(e) => setFilter('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все операции</option>
              {operationTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Дата от (API фильтр) */}
          <div>
            <Label>Дата от</Label>
            <FilterDatePicker
              id="stock-logs-date-from"
              placeholder="Дата от"
              value={filters.date_from}
              onChange={(_dates, dateStr) => setFilter('date_from', dateStr)}
            />
          </div>

          {/* Дата до (API фильтр) */}
          <div>
            <Label>Дата до</Label>
            <FilterDatePicker
              id="stock-logs-date-to"
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

      {/* Контейнер таблицы */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-200 dark:bg-blue-800 overflow-hidden z-20">
            <div className="h-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
          </div>
        )}

        {filteredStockLogs.length === 0 && !isLoading ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Логи не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-4">
              {hasActiveFilters
                ? 'Попробуйте изменить параметры фильтра или поиска'
                : 'История движения товаров пока пуста'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Товар
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Склад
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Количество
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Сотрудник
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Примечание
                  </th>
                </tr>
              </thead>
              <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${isFetching ? 'opacity-70' : ''}`}>
                {filteredStockLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`
                      transition-all duration-150
                      hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow-sm
                      ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}
                    `}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        #{log.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.type)}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                          {formatLogType(log.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {getProductName(log.product_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getWarehouseName(log.warehouse_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        log.type === 'outgoing'
                          ? 'text-red-600 dark:text-red-400'
                          : log.type === 'incoming'
                          ? 'text-blue-600 dark:text-blue-400'
                          : log.type === 'return'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {log.type === 'outgoing' ? '-' : '+'}
                        {log.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {log.created_by_user?.full_name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                      <div className="truncate" title={log.note || ''}>
                        {log.note || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <Pagination page={page} totalPages={data.total_pages} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
