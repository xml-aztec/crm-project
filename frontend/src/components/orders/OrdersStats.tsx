import { useMemo } from 'react';
import { 
  useGetMonthlyAnalyticsQuery,  
} from '../../store/api/ordersApi';

interface OrdersStatsProps {
  className?: string;
}

export default function OrdersStats({ className = '' }: OrdersStatsProps) {
  const { 
    data: monthlyData, 
    isLoading, 
    error 
  } = useGetMonthlyAnalyticsQuery(undefined, {
    pollingInterval: 300000,
    refetchOnMountOrArgChange: 300
  });

  const stats = useMemo(() => {
    if (!monthlyData) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        newOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        uniqueCustomers: 0,
        // ✅ ДОБАВЛЯЕМ: Предрассчитанные проценты
        completedPercent: '0',
        pendingPercent: '0',
        cancelledPercent: '0',
        ordersPerCustomer: '0'
      };
    }

    const statusCounts = monthlyData.status_counts.reduce((acc, item) => {
      acc[item.status_id] = item.count;
      return acc;
    }, {} as Record<number, number>);

    const total = monthlyData.total_orders;
    const completed = statusCounts[3] || 0;
    const pending = statusCounts[2] || 0;
    const cancelled = statusCounts[4] || 0;
    const newOrders = statusCounts[1] || 0;
    const uniqueCustomers = monthlyData.unique_customers;

    // ✅ ОПТИМИЗАЦИЯ: Считаем проценты один раз
    const completedPercent = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    const pendingPercent = total > 0 ? ((pending / total) * 100).toFixed(1) : '0';
    const cancelledPercent = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0';
    const ordersPerCustomer = (total > 0 && uniqueCustomers > 0) 
      ? (total / uniqueCustomers).toFixed(1) 
      : '0';

    return {
      total,
      completed,
      pending,
      cancelled,
      newOrders,
      totalRevenue: monthlyData.total_income,
      averageOrderValue: monthlyData.average_order_value,
      uniqueCustomers,
      // ✅ Предрассчитанные значения
      completedPercent,
      pendingPercent,
      cancelledPercent,
      ordersPerCustomer
    };
  }, [monthlyData]);

  const formatPrice = useMemo(() => {
    return (price: number) => {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KGS',
        minimumFractionDigits: 0
      }).format(price);
    };
  }, []);

  // ✅ ОПТИМИЗАЦИЯ: Статические данные карточек
  const statCards = useMemo(() => [
    {
      title: 'Всего заказов',
      value: stats.total.toLocaleString('ru-RU'),
      subtitle: `+${stats.newOrders} новых`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      textColor: 'text-blue-600 dark:text-blue-400',
      bgColorLight: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Завершённые',
      value: stats.completed.toLocaleString('ru-RU'),
      subtitle: `${stats.completedPercent}% от общего`, // ✅ Предрассчитанное значение
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      textColor: 'text-green-600 dark:text-green-400',
      bgColorLight: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'В работе',
      value: stats.pending.toLocaleString('ru-RU'),
      subtitle: `${stats.pendingPercent}% от общего`, // ✅ Предрассчитанное значение
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      textColor: 'text-orange-600 dark:text-orange-400',
      bgColorLight: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      title: 'Отменённые',
      value: stats.cancelled.toLocaleString('ru-RU'),
      subtitle: `${stats.cancelledPercent}% от общего`, // ✅ Предрассчитанное значение
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      textColor: 'text-red-600 dark:text-red-400',
      bgColorLight: 'bg-red-50 dark:bg-red-900/20'
    }
  ], [stats]); // ✅ Мемоизируем с зависимостью от stats

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-700 dark:text-red-400">
            Ошибка загрузки статистики заказов
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Статистика за текущий месяц
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {new Date().toLocaleDateString('ru-RU', { 
            year: 'numeric', 
            month: 'long' 
          })}
        </p>
      </div>

      {/* Основные счетчики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stat.subtitle}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColorLight} rounded-lg flex items-center justify-center`}>
                <div className={stat.textColor}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Дополнительная статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Общая выручка */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Общая выручка
            </h3>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            {formatPrice(stats.totalRevenue)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            За текущий месяц
          </p>
        </div>

        {/* Средняя стоимость заказа */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Средняя стоимость
            </h3>
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            {formatPrice(stats.averageOrderValue)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Средний чек
          </p>
        </div>

        {/* Уникальные клиенты остается без изменений */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Уникальных клиентов
            </h3>
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
            {stats.uniqueCustomers.toLocaleString('ru-RU')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {stats.ordersPerCustomer !== '0' ? `${stats.ordersPerCustomer} заказов на клиента` : 'Нет данных'}
          </p>
        </div>
      </div>
    </div>
  );
}