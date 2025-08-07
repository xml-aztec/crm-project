import React from 'react';
import { useGetOrderStockLogsQuery } from '../../store/api/stockLogsApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';

interface OrderStockLogsProps {
  orderId: number;
  className?: string;
}

const OrderStockLogs: React.FC<OrderStockLogsProps> = ({ orderId, className = '' }) => {
  const { data: logs = [], isLoading, error } = useGetOrderStockLogsQuery(orderId);
  const { data: products = [] } = useGetProductsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();

  // Вспомогательные функции
  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || `Товар #${productId}`;
  };

  const getWarehouseName = (warehouseId: number) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || `Склад #${warehouseId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: 'outgoing' | 'return' | 'incoming' | 'adjust') => {
    switch (type) {
      case 'outgoing':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m0 0l7-7m0 7V3" />
          </svg>
        );
      case 'return':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m0 0l-7 7m0-7h14" />
          </svg>
        );
      case 'incoming':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
        );
      case 'adjust':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTypeBadge = (type: 'outgoing' | 'return' | 'incoming' | 'adjust') => {
    switch (type) {
      case 'outgoing':
        return {
          emoji: '📤',
          text: 'Списание',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
      case 'return':
        return {
          emoji: '📥',
          text: 'Возврат',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        };
      case 'incoming':
        return {
          emoji: '📦',
          text: 'Поступление',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        };
      case 'adjust':
        return {
          emoji: '⚖️',
          text: 'Корректировка',
          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        };
      default:
        return {
          emoji: '❓',
          text: 'Неизвестно',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
        };
    }
  };

  const getQuantityColor = (type: 'outgoing' | 'return' | 'incoming' | 'adjust') => {
    switch (type) {
      case 'outgoing':
        return 'text-red-600 dark:text-red-400';
      case 'return':
      case 'incoming':
        return 'text-green-600 dark:text-green-400';
      case 'adjust':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getQuantitySign = (type: 'outgoing' | 'return' | 'incoming' | 'adjust') => {
    switch (type) {
      case 'outgoing':
        return '-';
      case 'return':
      case 'incoming':
        return '+';
      case 'adjust':
        return '±';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Загрузка логов...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="text-center py-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Ошибка загрузки логов складских операций
          </p>
        </div>
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="text-center py-4">
          <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Для этого заказа нет логов складских операций
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Логи появятся после подтверждения заказа
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          Логи складских операций
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            {logs.length} записей
          </span>
        </h4>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {logs.map((log) => {
          const typeBadge = getTypeBadge(log.type);
          return (
            <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(log.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.className}`}>
                        {typeBadge.emoji} {typeBadge.text}
                      </span>
                      
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        #{log.id}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-900 dark:text-white mb-1">
                      <strong>{getProductName(log.product_id)}</strong>
                    </div>
                    
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      <div>📍 Склад: {getWarehouseName(log.warehouse_id)}</div>
                      <div>{log.note}</div>
                      <div>🕒 {formatDate(log.created_at)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-bold ${getQuantityColor(log.type)}`}>
                    {getQuantitySign(log.type)}{log.quantity}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    шт.
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStockLogs;