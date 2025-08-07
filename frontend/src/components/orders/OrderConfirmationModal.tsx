import { useState, useEffect } from 'react';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  orderId: number | string;
  isConfirmed: boolean;
  orderItems?: Array<{ product_name?: string; quantity: number }>;
}

export default function OrderConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  orderId,
  isConfirmed,
  orderItems = []
}: OrderConfirmationModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Блокируем скролл при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsVisible(true);
    } else {
      document.body.style.overflow = 'unset';
      setIsVisible(false);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isLoading, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999999 }} 
      onClick={handleOverlayClick}
    >
      <div 
        className={`
          bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700
          transform transition-all duration-200 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
        style={{ zIndex: 99999999 }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Иконка */}
        <div className="flex justify-center mb-4">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${isConfirmed 
              ? 'bg-orange-100 dark:bg-orange-900/30' 
              : 'bg-green-100 dark:bg-green-900/30'
            }
          `}>
            {isConfirmed ? (
              <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.966-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Заголовок */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          {isConfirmed ? 'Отменить подтверждение?' : 'Подтвердить заказ?'}
        </h3>

        {/* Описание */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
          Заказ #{orderId}
        </p>

        {/* Информация о последствиях */}
        <div className={`
          rounded-lg p-4 mb-6 text-sm
          ${isConfirmed 
            ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' 
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }
        `}>
          <div className="space-y-2">
            <p className={`font-medium ${
              isConfirmed 
                ? 'text-orange-800 dark:text-orange-300' 
                : 'text-blue-800 dark:text-blue-300'
            }`}>
              ⚠️ {isConfirmed ? 'После отмены подтверждения:' : 'После подтверждения:'}
            </p>
            <ul className={`list-disc list-inside space-y-1 ml-2 ${
              isConfirmed 
                ? 'text-orange-700 dark:text-orange-400' 
                : 'text-blue-700 dark:text-blue-400'
            }`}>
              {isConfirmed ? (
                <>
                  <li>Товары будут возвращены на склад</li>
                  <li>Заказ можно будет редактировать</li>
                  <li>Сумма заказа может измениться</li>
                </>
              ) : (
                <>
                  <li>Товары будут списаны со склада</li>
                  <li>Сумма заказа будет зафиксирована</li>
                  <li>Заказ нельзя будет редактировать</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Информация о товарах */}
        {!isConfirmed && orderItems.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-6">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Товары к списанию ({orderItems.length}):
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {orderItems.slice(0, 3).map((item, index) => (
                <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                  • {item.product_name || `Товар #${index + 1}`} - {item.quantity} шт.
                </div>
              ))}
              {orderItems.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  ... и еще {orderItems.length - 3} товар(ов)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
              ${isConfirmed 
                ? 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600' 
                : 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
              }
            `}
          >
            {isLoading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="m100 50-6-6 13-13 6 6-13 13z" />
              </svg>
            )}
            {isConfirmed ? 'Отменить подтверждение' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}