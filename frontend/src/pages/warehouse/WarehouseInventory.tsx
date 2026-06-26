import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { LOW_STOCK_THRESHOLD } from '../../constants/stock';
import { useGetWarehouseByIdQuery } from '../../store/api/warehouseApi';
import { useGetBranchByIdQuery } from '../../store/api/branchesApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useGetStockQuery } from '../../store/api/stockApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDateTime } from '../../utils/dateUtils'; 
import Button from '../../components/ui/button/Button';
import AddStockForm from '../../components/stock/AddStockForm';
import QuantityEditor from '../../components/stock/QuantityEditor';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import { useDeleteStockMutation } from '../../store/api/stockApi';

const ITEMS_PER_PAGE = 20; 

interface Stock {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  updated_at: string;
}

interface StockResponse {
  stocks: Stock[];
  stats?: {
    total: number;
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
  };
}

interface InventoryFilters {
  search: string;
  stockLevel: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy: 'name' | 'quantity' | 'updated';
  sortOrder: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}

const WarehouseInventory: React.FC = () => {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const navigate = useNavigate();
  
  const warehouseIdNum = parseInt(warehouseId || '0');
  
  // ✅ Состояния пагинации как в StockLogsPage
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    stockLevel: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState<Stock | null>(null);
  
  // ✅ Дебаунс поиска как в StockLogsPage
  const debouncedFilters = useDebounce(filters, 300);

  // ✅ Параметры запроса с пагинацией как в StockLogsPage
  const queryParams = useMemo(() => ({
    warehouse_id: warehouseIdNum,
    name: debouncedFilters.search.trim() || undefined,
    stock_level: debouncedFilters.stockLevel !== 'all' ? debouncedFilters.stockLevel : undefined,
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE + 1, // +1 для определения hasNext
  }), [warehouseIdNum, debouncedFilters, currentPage]);

  // API запросы
  const { data: warehouse, isLoading: warehouseLoading, error: warehouseError } = useGetWarehouseByIdQuery(warehouseIdNum);
  const { data: branch } = useGetBranchByIdQuery(warehouse?.branch_id || 0, {
    skip: !warehouse?.branch_id
  });
  const { data: products = [] } = useGetProductsQuery();
  
  // ✅ API запрос с новыми параметрами
  const { 
    data: stockResponse, 
    isLoading: stockLoading, 
    error: stockError, 
    refetch 
  } = useGetStockQuery(queryParams);

  const [deleteStock, { isLoading: isDeleting }] = useDeleteStockMutation();

  // ✅ ИСПРАВЛЯЕМ: Обработка ответа с правильными типами
  const { currentInventory, hasNext, apiStats } = useMemo((): {
    currentInventory: Stock[];
    hasNext: boolean;
    apiStats: StockResponse['stats'] | null;
  } => {
    if (!stockResponse) return { currentInventory: [], hasNext: false, apiStats: null };

    const stockData = (stockResponse as StockResponse)?.stocks || [];
    const stats = (stockResponse as StockResponse)?.stats;
    const hasMorePages = stockData.length > ITEMS_PER_PAGE;
    const displayStocks = hasMorePages ? stockData.slice(0, ITEMS_PER_PAGE) : stockData;
    
    return {
      currentInventory: displayStocks,
      hasNext: hasMorePages,
      apiStats: stats || null
    };
  }, [stockResponse]);

  // ✅ Пагинация как в StockLogsPage
  const pagination = useMemo(() => {
    const hasPrevious = currentPage > 1;
    
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
  }, [currentPage, hasNext]);

  // ✅ Сброс на первую страницу при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.stockLevel, filters.sortBy, filters.sortOrder]);

  // ✅ Клиентская сортировка (фильтрация теперь делается на сервере)
  const filteredInventory = useMemo(() => {
    let filtered = [...currentInventory];

    // Сортировка (фильтрация теперь делается на сервере)
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (filters.sortBy) {
        case 'name':
          const productA = products.find(p => p.id === a.product_id);
          const productB = products.find(p => p.id === b.product_id);
          compareValue = (productA?.name || '').localeCompare(productB?.name || '');
          break;
        case 'quantity':
          compareValue = a.quantity - b.quantity;
          break;
        case 'updated':
          compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }

      return filters.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [currentInventory, products, filters.sortBy, filters.sortOrder]);

  // ✅ Используем статистику из API или вычисляем локально если нет
  const stats = useMemo(() => {
    if (apiStats) {
      return {
        totalProducts: apiStats.total,
        inStock: apiStats.in_stock,
        lowStock: apiStats.low_stock,
        outOfStock: apiStats.out_of_stock,
        totalQuantity: apiStats.total_quantity,
      };
    }

    // Fallback - вычисляем локально (только если API не вернул статистику)
    const totalProducts = currentInventory.length;
    const inStock = currentInventory.filter(item => item.quantity > LOW_STOCK_THRESHOLD).length;
    const lowStock = currentInventory.filter(item => item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD).length;
    const outOfStock = currentInventory.filter(item => item.quantity === 0).length;
    const totalQuantity = currentInventory.reduce((sum, item) => sum + item.quantity, 0);

    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
      totalQuantity
    };
  }, [currentInventory, apiStats]);

  // Обработчики
  const handleQuantityUpdate = useCallback((stockId: number, newQuantity: number) => {
    console.log(`Количество обновлено: ${stockId} -> ${newQuantity}`);
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

  const handleFilterChange = useCallback((field: keyof InventoryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const getStockLevelBadge = useCallback((quantity: number) => {
    if (quantity === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          Нет в наличии
        </span>
      );
    }
    
    if (quantity <= LOW_STOCK_THRESHOLD) {
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
  }, []);

  // ✅ ИСПРАВЛЯЕМ: Используем правильный форматтер времени как в StockLogsPage
  const formatDate = useCallback((dateString: string) => {
    return formatDateTime(dateString, { includeTime: true }); // UTC → Бишкек (+6)
  }, []);

  const getProductName = useCallback((productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || `Товар #${productId}`;
  }, [products]);

  const getProductSKU = useCallback((productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.sku || '';
  }, [products]);

  // ✅ Loading состояние как в StockLogsPage
  if (warehouseLoading || (stockLoading && !currentInventory.length)) {
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

  if (warehouseError || !warehouse) {
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
              Склад не найден
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Склад с ID #{warehouseId} не существует или недоступен
            </p>
            <Button onClick={() => navigate('/warehouses')}>
              Вернуться к складам
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stockError) {
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
              Не удалось загрузить остатки товаров на складе
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
      {/* Breadcrumb и заголовок */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <button 
          onClick={() => navigate('/warehouses')}
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Склады
        </button>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-white">{warehouse.name}</span>
      </div>

      {/* Информация о складе */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {warehouse.name}
              </h1>
              <div className="mt-1 space-y-1">
                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {warehouse.location}
                </p>
                {branch && (
                  <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {branch.name} - {branch.location}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Кнопка добавления остатка */}
          <Button onClick={() => setIsAddFormOpen(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить товар
          </Button>
        </div>
      </div>

      {/* Статистика из API */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Товаров</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">В наличии</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.inStock}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Мало</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lowStock}</p>
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
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.outOfStock}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Общее кол-во</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalQuantity}</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Поиск */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Поиск товаров
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Название, SKU или штрихкод..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Фильтр по уровню запасов */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Уровень запасов
            </label>
            <select
              value={filters.stockLevel}
              onChange={(e) => handleFilterChange('stockLevel', e.target.value as any)}
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
              <option value="name">Названию</option>
              <option value="quantity">Количеству</option>
              <option value="updated">Дате обновления</option>
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
              <option value="asc">По возрастанию</option>
              <option value="desc">По убыванию</option>
            </select>
          </div>
        </div>
      </div>

      {/* ✅ Таблица остатков с пагинацией как в StockLogsPage */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {stockLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-200 dark:bg-blue-800 overflow-hidden z-20">
            <div className="h-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
          </div>
        )}

        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Остатки товаров
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Страница {currentPage}, показано {filteredInventory.length} записей
            </span>
          </div>
        </div>

        {filteredInventory.length === 0 && !stockLoading ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Товары не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-4">
              {filters.search || filters.stockLevel !== 'all' 
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'На складе пока нет товаров'
              }
            </p>
            <Button onClick={() => setIsAddFormOpen(true)}>
              Добавить товар на склад
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Товар
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
              <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${stockLoading ? 'opacity-70' : ''}`}>
                {filteredInventory.map((stock, index) => (
                  <tr 
                    key={stock.id} 
                    className={`
                      transition-all duration-150
                      hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow-sm
                      ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}
                    `}
                  >
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
                      <QuantityEditor
                        stockId={stock.id}
                        currentQuantity={stock.quantity}
                        onUpdate={(newQuantity) => handleQuantityUpdate(stock.id, newQuantity)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStockLevelBadge(stock.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDate(stock.updated_at)}
                      </div>
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

        {/* ✅ Пагинация точно как в StockLogsPage */}
        {(pagination.hasPrevious || hasNext) && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={pagination.prevPage}
                disabled={!pagination.hasPrevious || stockLoading}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Назад
              </button>
              <button
                onClick={pagination.nextPage}
                disabled={!hasNext || stockLoading}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Далее
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Страница <span className="font-medium">{currentPage}</span>, показано <span className="font-medium">{filteredInventory.length}</span> записей
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={pagination.prevPage}
                    disabled={!pagination.hasPrevious || stockLoading}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Предыдущая</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
                    {currentPage}
                  </span>
                  <button
                    onClick={pagination.nextPage}
                    disabled={!hasNext || stockLoading}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Следующая</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальные окна */}
      <AddStockForm
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
        preselectedWarehouseId={warehouseIdNum}
      />

      <DeleteConfirmModal
        title="Удалить остаток?"
        itemName={stockToDelete ? `${getProductName(stockToDelete.product_id)} со склада` : ''}
        isOpen={!!stockToDelete}
        onClose={() => setStockToDelete(null)}
        onConfirm={handleDeleteStock}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default WarehouseInventory;