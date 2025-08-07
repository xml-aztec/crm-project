import React, { useState, useMemo, useCallback } from 'react';
import { useGetStockQuery, useDeleteStockMutation } from '../../store/api/stockApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import QuantityEditor from '../../components/stock/QuantityEditor';
import AddStockForm from '../../components/stock/AddStockForm';
import Button from '../../components/ui/button/Button';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime } from '../../utils/dateUtils';

interface StockFilters {
  search: string;
  warehouse_id: string;
  stock_level: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy: 'product_name' | 'warehouse_name' | 'quantity' | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

const StockManagement: React.FC = () => {
  const [filters, setFilters] = useState<StockFilters>({
    search: '',
    warehouse_id: '',
    stock_level: 'all',
    sortBy: 'updated_at',
    sortOrder: 'desc'
  });
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Debounce поиска для оптимизации API запросов
  const debouncedSearch = useDebounce(filters.search, 500);

  // API запросы с новой структурой
  const { 
    data: stockResponse, 
    isLoading, 
    error, 
    refetch 
  } = useGetStockQuery({
    // Используем debounced поиск
    name: debouncedSearch.trim() || undefined,
    warehouse_id: filters.warehouse_id ? parseInt(filters.warehouse_id) : undefined,
    stock_level: filters.stock_level !== 'all' ? filters.stock_level : undefined,
    skip: (page - 1) * pageSize,
    limit: pageSize
  });

  const { data: products = [] } = useGetProductsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const [deleteStock, { isLoading: isDeleting }] = useDeleteStockMutation();

  // Извлекаем данные из новой структуры ответа
  const stockData = stockResponse?.stocks || [];
  const apiStats = stockResponse?.stats;

  // Мемоизированная сортировка (фильтрация теперь делается на сервере)
  const filteredAndSortedStock = useMemo(() => {
    let filtered = [...stockData];

    // Сортировка (основная фильтрация делается на сервере)
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (filters.sortBy) {
        case 'product_name':
          const productA = products.find(p => p.id === a.product_id);
          const productB = products.find(p => p.id === b.product_id);
          compareValue = (productA?.name || '').localeCompare(productB?.name || '');
          break;
        case 'warehouse_name':
          const warehouseA = warehouses.find(w => w.id === a.warehouse_id);
          const warehouseB = warehouses.find(w => w.id === b.warehouse_id);
          compareValue = (warehouseA?.name || '').localeCompare(warehouseB?.name || '');
          break;
        case 'quantity':
          compareValue = a.quantity - b.quantity;
          break;
        case 'updated_at':
          // Сравнение дат
          const dateA = new Date(a.updated_at).getTime();
          const dateB = new Date(b.updated_at).getTime();
          compareValue = dateA - dateB;
          break;
      }

      return filters.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [stockData, products, warehouses, filters.sortBy, filters.sortOrder]);

  // Статистика из API (больше не нужно локальное вычисление)
  const stats = useMemo(() => {
    if (apiStats) {
      return {
        total_items: apiStats.total,
        total_quantity: stockData.reduce((sum, item) => sum + item.quantity, 0),
        low_stock_count: apiStats.low_stock,
        out_of_stock_count: apiStats.out_of_stock,
        warehouses_count: new Set(stockData.map(item => item.warehouse_id)).size
      };
    }

    // Fallback если статистика из API недоступна
    return {
      total_items: stockData.length,
      total_quantity: stockData.reduce((sum, item) => sum + item.quantity, 0),
      low_stock_count: stockData.filter(item => item.quantity > 0 && item.quantity <= 10).length,
      out_of_stock_count: stockData.filter(item => item.quantity === 0).length,
      warehouses_count: new Set(stockData.map(item => item.warehouse_id)).size
    };
  }, [stockData, apiStats]);

  // Обработчики
  const handleQuantityUpdate = useCallback((_stockId: number, _newQuantity: number) => {
    // Обновление уже обработано в QuantityEditor через optimistic update
    // Параметры помечены как неиспользуемые с префиксом _
  }, []);

  const handleDeleteStock = useCallback(async () => {
    if (!stockToDelete) return;
    
    try {
      await deleteStock(stockToDelete.id).unwrap();
      setStockToDelete(null);
    } catch (error) {
      // Ошибка обработана в middleware
    }
  }, [stockToDelete, deleteStock]);

  const handleFilterChange = useCallback((field: keyof StockFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Сброс пагинации при изменении фильтров
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      warehouse_id: '',
      stock_level: 'all',
      sortBy: 'updated_at',
      sortOrder: 'desc'
    });
    setPage(1);
  }, []);

  // Вспомогательные функции
  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || `Товар #${productId}`;
  };

  const getProductSKU = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.sku || '';
  };

  const getWarehouseName = (warehouseId: number) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || `Склад #${warehouseId}`;
  };

  const getWarehouseLocation = (warehouseId: number) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.location || '';
  };

  const getStockStatusBadge = (quantity: number) => {
    if (quantity === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          Нет в наличии
        </span>
      );
    }
    
    if (quantity <= 10) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          Мало
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
        В наличии
      </span>
    );
  };

  // Индикатор загрузки для поиска
  const isSearching = debouncedSearch !== filters.search && filters.search.length > 0;

  if (isLoading && !stockData.length) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Загрузка остатков...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Не удалось загрузить остатки товаров
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
            Управление остатками
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Отслеживание и управление остатками товаров на складах
          </p>
        </div>
        
        <Button onClick={() => setIsAddFormOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить остаток
        </Button>
      </div>

      {/* Статистика из API */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Всего позиций</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_items}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Общее кол-во</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.total_quantity}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Мало на складе</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.low_stock_count}</p>
            </div>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Закончились</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.out_of_stock_count}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Складов</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.warehouses_count}</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры с обновленными параметрами */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Поиск с индикатором загрузки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Поиск
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Название, SKU, штрихкод..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>

          {/* Склад */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Склад
            </label>
            <select
              value={filters.warehouse_id}
              onChange={(e) => handleFilterChange('warehouse_id', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все склады</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          {/* Уровень запасов */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Уровень запасов
            </label>
            <select
              value={filters.stock_level}
              onChange={(e) => handleFilterChange('stock_level', e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все товары</option>
              <option value="in_stock">В наличии</option>
              <option value="low_stock">Мало</option>
              <option value="out_of_stock">Закончились</option>
            </select>
          </div>

          {/* Сортировка */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сортировать по
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="updated_at">Дате обновления</option>
              <option value="product_name">Названию товара</option>
              <option value="warehouse_name">Названию склада</option>
              <option value="quantity">Количеству</option>
            </select>
          </div>

          {/* Порядок сортировки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Порядок
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
            </select>
          </div>
        </div>

        {/* Кнопка очистки фильтров */}
        {(filters.search || filters.warehouse_id || filters.stock_level !== 'all') && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Очистить фильтры
            </Button>
          </div>
        )}
      </div>

      {/* Таблица остатков с индикатором загрузки */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Остатки товаров
              {(isLoading || isSearching) && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              )}
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Найдено: {filteredAndSortedStock.length} позиций
            </span>
          </div>
        </div>

        {filteredAndSortedStock.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Остатки не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {filters.search || filters.warehouse_id || filters.stock_level !== 'all'
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'Добавьте первый остаток товара на склад'
              }
            </p>
            <Button onClick={() => setIsAddFormOpen(true)}>
              Добавить остаток
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Товар
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Склад
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Количество
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Обновлено
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedStock.map((stock) => (
                  <tr key={stock.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getProductName(stock.product_id)}
                        </div>
                        {getProductSKU(stock.product_id) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            SKU: {getProductSKU(stock.product_id)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getWarehouseName(stock.warehouse_id)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {getWarehouseLocation(stock.warehouse_id)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <QuantityEditor
                        stockId={stock.id}
                        currentQuantity={stock.quantity}
                        onUpdate={(newQuantity) => handleQuantityUpdate(stock.id, newQuantity)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStockStatusBadge(stock.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(stock.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setStockToDelete(stock)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Удалить остаток"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальные окна */}
      <AddStockForm
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
      />

      <DeleteConfirmModal
        title="Удалить остаток?"
        itemName={stockToDelete ? `${getProductName(stockToDelete.product_id)} на ${getWarehouseName(stockToDelete.warehouse_id)}` : ''}
        isOpen={!!stockToDelete}
        onClose={() => setStockToDelete(null)}
        onConfirm={handleDeleteStock}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default StockManagement;