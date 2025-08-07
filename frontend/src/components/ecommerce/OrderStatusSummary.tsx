import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useGetOrderStatusSummaryQuery } from '../../store/api/ordersApi';

export default function OrderStatusSummary() {
  const navigate = useNavigate();

  // ✅ Получаем данные сводки по статусам
  const {
    data: statusSummary = [],
    isLoading,
    error,
    refetch
  } = useGetOrderStatusSummaryQuery(undefined, {
    pollingInterval: 300000, // Обновляем каждые 5 минут
    refetchOnMountOrArgChange: 180, // 3 минуты
  });

  // ✅ Определение цвета и иконки статуса
  const getStatusConfig = useMemo(() => {
    return (status: string) => {
      const statusLower = status.toLowerCase();
      
      if (statusLower.includes('завершен') || statusLower.includes('доставлен')) {
        return {
          color: 'bg-green-500',
          bgLight: 'bg-green-50 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-400',
          icon: (
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        };
      }
      
      if (statusLower.includes('в работе') || statusLower.includes('обработка')) {
        return {
          color: 'bg-orange-500',
          bgLight: 'bg-orange-50 dark:bg-orange-900/20',
          textColor: 'text-orange-700 dark:text-orange-400',
          icon: (
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      }
      
      if (statusLower.includes('отменен') || statusLower.includes('отклонен')) {
        return {
          color: 'bg-red-500',
          bgLight: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-700 dark:text-red-400',
          icon: (
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        };
      }
      
      // Новый, Ожидание и т.д.
      return {
        color: 'bg-blue-500',
        bgLight: 'bg-blue-50 dark:bg-blue-900/20',
        textColor: 'text-blue-700 dark:text-blue-400',
        icon: (
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      };
    };
  }, []);

  // ✅ Обработчики
  const handleViewAllOrders = () => {
    navigate('/orders');
  };

  const handleViewStatusOrders = (status: string) => {
    // Определяем ID статуса на основе названия
    const statusMap: Record<string, string> = {
      'новый': '1',
      'в работе': '2', 
      'завершен': '3',
      'отменен': '4'
    };
    
    const statusId = statusMap[status.toLowerCase()];
    if (statusId) {
      navigate(`/orders?status=${statusId}`);
    } else {
      navigate('/orders');
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // ✅ Состояние ошибки
  if (error) {
    return (
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-4 pb-2 pt-4 dark:border-red-800 dark:bg-red-900/20 sm:px-6 min-h-[600px] flex items-center justify-center">
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Ошибка загрузки данных
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            Не удалось загрузить сводку по статусам
          </p>
          <button 
            onClick={handleRefresh}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-2 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 min-h-[600px] flex flex-col">
      {/* Заголовок */}
      <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Статусы заказов
            </h3>
            {isLoading && (
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 w-2 animate-spin rounded-full border border-purple-500 border-t-transparent"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Загрузка...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleViewAllOrders}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            Все заказы
          </button>
        </div>
      </div>

      {/* Контент - занимает оставшееся пространство */}
      <div className="space-y-3 flex-1 flex flex-col">
        {isLoading ? (
          // Состояние загрузки
          <div className="flex-1 flex flex-col justify-center">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="animate-pulse mb-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : statusSummary.length === 0 ? (
          // Пустое состояние
          <div className="text-center py-12 flex-1 flex flex-col justify-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Нет данных по статусам
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Статистика появится после создания заказов
            </p>
            <button 
              onClick={() => navigate('/orders/create')}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Создать заказ
            </button>
          </div>
        ) : (
          // Список статусов
          <div className="flex-1">
            {statusSummary.map((item, index) => {
              const config = getStatusConfig(item.status);
              
              return (
                <div 
                  key={index}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600 cursor-pointer mb-3"
                  onClick={() => handleViewStatusOrders(item.status)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgLight}`}>
                        {config.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {item.status}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.count} {item.count === 1 ? 'заказ' : item.count < 5 ? 'заказа' : 'заказов'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${config.textColor}`}>
                        {item.percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        от общего
                      </div>
                    </div>
                  </div>
                  
                  {/* Прогресс бар */}
                  <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${config.color}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Hover эффект */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-gray-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-gray-800/50" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}