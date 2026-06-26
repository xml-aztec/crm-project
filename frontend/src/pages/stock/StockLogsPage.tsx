import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useGetStockLogsQuery } from '../../store/api/stockLogsApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import { useDebounce } from '../../hooks/useDebounce';
import { FilterDatePicker } from '../../components/form/DatePickerVariants';
import Label from '../../components/form/Label';
import Button from '../../components/ui/button/Button';

const ITEMS_PER_PAGE = 20; 

interface StockLogsFilters {
  product_id?: number;
  warehouse_id?: number;
  order_id?: number;
  type?: 'incoming' | 'outgoing' | 'return' | 'adjust';
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export default function StockLogsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<StockLogsFilters>(() => {
    const orderId = searchParams.get('order_id');
    return orderId ? { order_id: Number(orderId) } : {};
  });
  
  // Отдельно обрабатываем поиск для локальной фильтрации
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Дебаунс только для API параметров
  const debouncedFilters = useDebounce(filters, 300);

  // Параметры для API запроса с правильной пагинацией
  const queryParams = useMemo(() => ({
    product_id: debouncedFilters.product_id,
    warehouse_id: debouncedFilters.warehouse_id,
    order_id: debouncedFilters.order_id,
    type: debouncedFilters.type,
    date_from: debouncedFilters.date_from,
    date_to: debouncedFilters.date_to,
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
  }), [debouncedFilters, currentPage]);

  const {
    data: apiResponse,
    isLoading,
    error,
    refetch
  } = useGetStockLogsQuery(queryParams);

  const { data: products = [] } = useGetProductsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();

  // Локальная фильтрация по названию товара
  const filteredStockLogs = useMemo(() => {
    if (!apiResponse) return [];

    let logs = Array.isArray(apiResponse) ? apiResponse : [];
    
    // Применяем локальный поиск по названию товара
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      logs = logs.filter(log => {
        const product = products.find(p => p.id === log.product_id);
        const productName = product?.name || '';
        return productName.toLowerCase().includes(searchLower);
      });
    }

    return logs;
  }, [apiResponse, debouncedSearchTerm, products]);

  // Пагинация на основе размера ответа API
  const pagination = useMemo(() => {
    const hasPrevious = currentPage > 1;
    const hasNext = filteredStockLogs.length === ITEMS_PER_PAGE; // Если получили полную страницу, значит есть следующая
    
    return {
      currentPage,
      hasNext,
      hasPrevious,
      nextPage: () => {
        if (hasNext) {
          setCurrentPage(prev => prev + 1);
        }
      },
      prevPage: () => {
        if (hasPrevious) {
          setCurrentPage(prev => prev - 1);
        }
      },
      goToPage: (page: number) => {
        if (page >= 1) {
          setCurrentPage(page);
        }
      },
      resetToFirstPage: () => {
        setCurrentPage(1);
      }
    };
  }, [currentPage, filteredStockLogs.length]);

  // Сброс пагинации при изменении фильтров или поиска
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.product_id, filters.warehouse_id, filters.order_id, filters.type, filters.date_from, filters.date_to, debouncedSearchTerm]);

  const operationTypeOptions = [
    { value: 'incoming', label: 'Поступление' },
    { value: 'outgoing', label: 'Списание' },
    { value: 'return', label: 'Возврат' },
    { value: 'adjust', label: 'Корректировка' },
  ];

  // Обработчики фильтров
  const handleFilterChange = useCallback((field: keyof StockLogsFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
  }, []);

  // Проверяем, есть ли активные фильтры
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== undefined) || searchTerm.trim() !== '';
  }, [filters, searchTerm]);

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
  if (isLoading && !filteredStockLogs.length) {
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
      <div className="flex items-center justify-between">
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

      {/* Оптимизированные фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Первая строка - Поиск и Товар на всю ширину */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Поиск по названию товара (локальная фильтрация) */}
          <div>
            <Label>Поиск по названию товара</Label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Название товара..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Товар (API фильтр) */}
          <div>
            <Label>Товар</Label>
            <select
              value={filters.product_id?.toString() || ''}
              onChange={(e) => handleFilterChange('product_id', e.target.value ? parseInt(e.target.value) : undefined)}
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
              value={filters.warehouse_id?.toString() || ''}
              onChange={(e) => handleFilterChange('warehouse_id', e.target.value ? parseInt(e.target.value) : undefined)}
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
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
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
              value={filters.date_from || ''}
              onChange={(_dates, dateStr) => handleFilterChange('date_from', dateStr)}
            />
          </div>

          {/* Дата до (API фильтр) */}
          <div>
            <Label>Дата до</Label>
            <FilterDatePicker
              id="stock-logs-date-to"
              placeholder="Дата до"
              value={filters.date_to || ''}
              onChange={(_dates, dateStr) => handleFilterChange('date_to', dateStr)}
            />
          </div>
        </div>

        {/* Кнопка очистки фильтров */}
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Очистить фильтры
            </Button>
          </div>
        )}
      </div>

      {/* Контейнер таблицы */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {isLoading && (
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
              <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${isLoading ? 'opacity-70' : ''}`}>
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

        {/* Улучшенная пагинация */}
        {(pagination.hasPrevious || pagination.hasNext) && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.prevPage}
                disabled={!pagination.hasPrevious || isLoading}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.nextPage}
                disabled={!pagination.hasNext || isLoading}
              >
                Далее
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Страница <span className="font-medium">{currentPage}</span>
                  {filteredStockLogs.length > 0 && (
                    <>, показано <span className="font-medium">{filteredStockLogs.length}</span> записей</>
                  )}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pagination.prevPage}
                    disabled={!pagination.hasPrevious || isLoading}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Предыдущая</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </Button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
                    {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pagination.nextPage}
                    disabled={!pagination.hasNext || isLoading}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Следующая</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}