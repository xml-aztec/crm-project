import React from 'react';
import { useGetOrderStockLogsQuery } from '../../store/api/stockLogsApi';
import Button from '../ui/button/Button';

interface OrderStockLogsSummaryProps {
  orderId: number;
  className?: string;
}

const OrderStockLogsSummary: React.FC<OrderStockLogsSummaryProps> = ({ 
  orderId, 
  className = '' 
}) => {
  const { data: logs = [], isLoading, error } = useGetOrderStockLogsQuery(orderId);

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center py-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Ошибка загрузки данных о складских операциях
          </p>
        </div>
      </div>
    );
  }

  const returnCount = logs.filter(log => log.type === 'return').length;
  const outgoingCount = logs.filter(log => log.type === 'outgoing').length;
  const totalQuantity = logs.reduce((sum, log) => {
    return sum + (log.type === 'outgoing' ? -log.quantity : log.quantity);
  }, 0);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Заголовок */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📦 История складских операций
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`/stock/logs?order_id=${orderId}`, '_blank')}
          >
            Подробнее
          </Button>
        </div>
      </div>

      {/* Содержимое */}
      <div className="p-6">
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Складские операции по этому заказу отсутствуют
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Операции появятся после подтверждения заказа
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Краткая статистика */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {logs.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Всего операций
                </div>
              </div>
              
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {outgoingCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Списаний
                </div>
              </div>
              
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {returnCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Возвратов
                </div>
              </div>
            </div>

            {/* Информация о последней операции */}
            {logs.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Последняя операция:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(logs[logs.length - 1].created_at).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                {Math.abs(totalQuantity) > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Общее изменение:
                    </span>
                    <span className={`font-medium ${
                      totalQuantity < 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {totalQuantity < 0 ? '' : '+'}{totalQuantity} шт.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStockLogsSummary;