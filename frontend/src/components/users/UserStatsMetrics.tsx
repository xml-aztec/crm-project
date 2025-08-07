import { useMemo, useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { useGetUserStatsByIdQuery } from '../../store/api/userStatsApi';
import Label from '../form/Label';

interface UserStatsMetricsProps {
  className?: string;
  userId?: number; // ID пользователя для получения статистики
}

export default function UserStatsMetrics({ className = '', userId }: UserStatsMetricsProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // ✅ УПРОЩАЕМ: Используем только один hook для всех случаев
  const { 
    data: currentStats, 
    isLoading: currentLoading, 
    error: currentError 
  } = useGetUserStatsByIdQuery({ 
    userId: userId!, 
    year: selectedYear, 
    month: selectedMonth 
  }, {
    skip: !userId // Пропускаем запрос если userId не передан
  });

  // Получаем статистику за предыдущий месяц для сравнения
  const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  
  const { 
    data: previousStats,
    isLoading: previousLoading 
  } = useGetUserStatsByIdQuery({ 
    userId: userId!, 
    year: previousYear, 
    month: previousMonth 
  }, {
    skip: !userId // Пропускаем запрос если userId не передан
  });

  const isLoading = currentLoading || previousLoading;

  // Если userId не передан, показываем сообщение
  if (!userId) {
    return (
      <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            Для отображения статистики необходимо указать пользователя
          </span>
        </div>
      </div>
    );
  }

  // Вычисляем изменения по сравнению с предыдущим периодом
  const statsComparison = useMemo(() => {
    if (!currentStats || !previousStats) {
      return {
        ordersChange: 0,
        incomeChange: 0,
        canceledChange: 0,
        ordersChangePercent: '0',
        incomeChangePercent: '0',
        canceledChangePercent: '0',
        ordersGrowth: false,
        incomeGrowth: false,
        canceledGrowth: false
      };
    }

    const ordersChange = currentStats.orders_count - previousStats.orders_count;
    const incomeChange = currentStats.total_income - previousStats.total_income;
    const canceledChange = (currentStats.canceled_orders || 0) - (previousStats.canceled_orders || 0);
    
    const ordersChangePercent = previousStats.orders_count > 0 
      ? ((ordersChange / previousStats.orders_count) * 100).toFixed(1)
      : currentStats.orders_count > 0 ? '100' : '0';
      
    const incomeChangePercent = previousStats.total_income > 0 
      ? ((incomeChange / previousStats.total_income) * 100).toFixed(1)
      : currentStats.total_income > 0 ? '100' : '0';

    const canceledChangePercent = (previousStats.canceled_orders || 0) > 0
      ? ((canceledChange / (previousStats.canceled_orders || 1)) * 100).toFixed(1)
      : (currentStats.canceled_orders || 0) > 0 ? '100' : '0';

    return {
      ordersChange,
      incomeChange,
      canceledChange,
      ordersChangePercent,
      incomeChangePercent,
      canceledChangePercent,
      ordersGrowth: ordersChange >= 0,
      incomeGrowth: incomeChange >= 0,
      canceledGrowth: canceledChange >= 0
    };
  }, [currentStats, previousStats]);

  // Функции форматирования
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M сом';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + 'K сом';
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' сом';
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' сом';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatPercent = (value: number) => {
    return (value * 100).toFixed(1) + '%';
  };

  const months = [
    { value: 1, label: 'Январь' },
    { value: 2, label: 'Февраль' },
    { value: 3, label: 'Март' },
    { value: 4, label: 'Апрель' },
    { value: 5, label: 'Май' },
    { value: 6, label: 'Июнь' },
    { value: 7, label: 'Июль' },
    { value: 8, label: 'Август' },
    { value: 9, label: 'Сентябрь' },
    { value: 10, label: 'Октябрь' },
    { value: 11, label: 'Ноябрь' },
    { value: 12, label: 'Декабрь' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (currentError) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-700 dark:text-red-400">
            Ошибка загрузки статистики
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Фильтры периода */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Год</Label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Месяц</Label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 mb-6">
        {/* 1. Количество заказов */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl dark:bg-blue-900/30">
            {isLoading ? (
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            ) : (
              <BoxIconLine className="text-blue-600 dark:text-blue-400 size-6" />
            )}
          </div>

          <div className="flex items-end justify-between mt-5">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Количество заказов
              </span>
              {isLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mt-2 animate-pulse"></div>
              ) : (
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90 truncate" title={currentStats?.orders_count?.toString()}>
                  {formatNumber(currentStats?.orders_count || 0)}
                </h4>
              )}
            </div>
            {!isLoading && previousStats && (
              <div className="flex-shrink-0 ml-2">
                <Badge color={statsComparison.ordersGrowth ? "success" : "error"}>
                  {statsComparison.ordersGrowth ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  {Math.abs(parseFloat(statsComparison.ordersChangePercent))}%
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* 2. Общий доход */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl dark:bg-green-900/30">
            {isLoading ? (
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            ) : (
              <GroupIcon className="text-green-600 dark:text-green-400 size-6" />
            )}
          </div>
          
          <div className="flex items-end justify-between mt-5">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Общий доход
              </span>
              {isLoading ? (
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mt-2 animate-pulse"></div>
              ) : (
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90 truncate" title={formatCurrencyFull(currentStats?.total_income || 0)}>
                  {formatCurrency(currentStats?.total_income || 0)}
                </h4>
              )}
            </div>
            {!isLoading && previousStats && (
              <div className="flex-shrink-0 ml-2">
                <Badge color={statsComparison.incomeGrowth ? "success" : "error"}>
                  {statsComparison.incomeGrowth ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  {Math.abs(parseFloat(statsComparison.incomeChangePercent))}%
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* 3. Средний чек */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl dark:bg-purple-900/30">
            {isLoading ? (
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            ) : (
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            )}
          </div>
          
          <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Средний чек
            </span>
            {isLoading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-2 animate-pulse"></div>
            ) : (
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90 truncate" title={formatCurrencyFull(currentStats?.avg_check || 0)}>
                {formatCurrency(currentStats?.avg_check || 0)}
              </h4>
            )}
          </div>
        </div>

        {/* 4. Среднее количество товаров в заказе */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl dark:bg-indigo-900/30">
            {isLoading ? (
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            ) : (
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            )}
          </div>
          
          <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Товаров в заказе
            </span>
            {isLoading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mt-2 animate-pulse"></div>
            ) : (
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {currentStats?.avg_items_per_order ? currentStats.avg_items_per_order.toFixed(1) : '0'}
              </h4>
            )}
          </div>
        </div>
      </div>

      {/* Дополнительная статистика */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Отмененные заказы - ВСЕГДА ПОКАЗЫВАЕМ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Отмененные заказы
            </h5>
            {!isLoading && previousStats && (
              <Badge color={statsComparison.canceledGrowth ? "error" : "success"} size="sm">
                {statsComparison.canceledGrowth ? <ArrowUpIcon /> : <ArrowDownIcon />}
                {Math.abs(parseFloat(statsComparison.canceledChangePercent))}%
              </Badge>
            )}
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Количество:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {currentStats?.canceled_orders || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Доля отмен:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatPercent(currentStats?.canceled_share || 0)}
                </span>
              </div>
              {currentStats?.canceled_orders === 0 && (
                <div className="text-center py-2">
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✅ Нет отмененных заказов
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Активность клиентов - ВСЕГДА ПОКАЗЫВАЕМ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Активность клиентов
          </h5>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : currentStats?.orders_by_clients && currentStats.orders_by_clients.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {currentStats.orders_by_clients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Клиент #{client.customer_id}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatNumber(client.orders)} заказов
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Нет данных о клиентах
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Топ товары - ВСЕГДА ПОКАЗЫВАЕМ */}
      {!isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Топ товары
          </h5>
          
          {currentStats?.top_products && currentStats.top_products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
              {currentStats.top_products.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate" title={product.name}>
                      {product.name}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap ml-2">
                    {formatNumber(product.total_sold)} шт.
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Нет данных о продажах товаров
              </span>
            </div>
          )}
        </div>
      )}

      {/* Сводная информация о периоде */}
      {!isLoading && currentStats && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Сводка за {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </h5>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(currentStats.orders_count)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Всего заказов
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400" title={formatCurrencyFull(currentStats.total_income)}>
                {formatCurrency(currentStats.total_income)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Общий доход
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400" title={formatCurrencyFull(currentStats.avg_check || 0)}>
                {formatCurrency(currentStats.avg_check || 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Средний чек
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {currentStats.avg_items_per_order ? currentStats.avg_items_per_order.toFixed(1) : '0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Товаров в заказе
              </div>
            </div>
          </div>
          
          {/* Дополнительная информация */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Отменено заказов:</span>
                <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                  {currentStats.canceled_orders || 0} ({formatPercent(currentStats.canceled_share || 0)})
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Уникальных клиентов:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {currentStats.orders_by_clients?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Видов товаров:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {currentStats.top_products?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}