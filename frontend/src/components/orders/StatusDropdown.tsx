import { useState, useCallback, useEffect, useRef } from 'react';
import { Order, useUpdateOrderStatusMutation, useGetOrderStatusesQuery } from '../../store/api/ordersApi';
import { useRoleAccess } from '../../hooks/useRoleAccess';

interface StatusDropdownProps {
  order: Order;
  onStatusUpdate: () => void;
  disabled?: boolean;
}

const CancellationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) => {
  const [reason, setReason] = useState('');

  // Блокируем скролл при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      handleClose();
    }
  };

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 999999 }} // ✅ Высокий z-index для отображения поверх хедера
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-200"
        style={{ zIndex: 999999 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Отмена заказа
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Укажите причину отмены заказа
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Причина отмены <span className="text-red-500">*</span>
              </label>
              <textarea
                id="cancellation-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none"
                placeholder="Например: Клиент передумал, проблемы с доставкой, товар закончился..."
                required
                autoFocus
                disabled={isLoading}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Эта информация будет сохранена и отображена в истории заказа.
              </p>
            </div>

            {/* Предустановленные варианты */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Популярные причины:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Клиент передумал',
                  'Товар закончился',
                  'Проблемы с доставкой',
                  'Неверная цена',
                  'Дубль заказа'
                ].map((presetReason) => (
                  <button
                    key={presetReason}
                    type="button"
                    onClick={() => setReason(presetReason)}
                    disabled={isLoading}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {presetReason}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || isLoading}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Отменяю заказ...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Отменить заказ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ChevronDownIcon = () => (
  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LoadingIcon = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function StatusDropdown({ order, onStatusUpdate, disabled = false }: StatusDropdownProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: statuses = [] } = useGetOrderStatusesQuery();
  const [updateStatus, { isLoading }] = useUpdateOrderStatusMutation();
  const { isAdmin } = useRoleAccess();

  // ✅ ОБНОВЛЕННЫЙ обработчик изменения статуса
  const handleStatusChange = useCallback(async (statusId: number) => {
    // Если переводим в статус "Отменён" (ID = 4), показываем модальное окно
    if (statusId === 4) {
      setPendingStatusId(statusId);
      setIsModalOpen(true);
      setIsOpen(false); // Закрываем dropdown
      return;
    }

    // Для других статусов обновляем сразу
    try {
      await updateStatus({ 
        id: order.id, 
        data: { status_id: statusId } 
      }).unwrap();
      setIsOpen(false);
      onStatusUpdate();
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
    }
  }, [order.id, updateStatus, onStatusUpdate]);

  // ✅ НОВЫЙ обработчик подтверждения отмены
  const handleCancellationConfirm = useCallback(async (reason: string) => {
    if (!pendingStatusId) return;

    try {
      await updateStatus({ 
        id: order.id, 
        data: { 
          status_id: pendingStatusId,
          cancellation_reason: reason
        } 
      }).unwrap();
      
      setIsModalOpen(false);
      setPendingStatusId(null);
      onStatusUpdate();
    } catch (error) {
      console.error('Ошибка при отмене заказа:', error);
    }
  }, [order.id, pendingStatusId, updateStatus, onStatusUpdate]);

  // ✅ НОВЫЙ обработчик закрытия модального окна
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setPendingStatusId(null);
  }, []);

  // ✅ ИСПРАВЛЯЕМ: Получаем цвет статуса с проверкой на undefined
  const getStatusColor = (statusName: string) => {
    const statusId = statuses.find(s => s.name === statusName)?.id;
    switch (statusId) {
      case 1: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'; // Новый
      case 2: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'; // В работе
      case 3: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'; // Завершён
      case 4: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'; // Отменён
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // ✅ ИСПРАВЛЯЕМ: Добавляем проверку на существование currentStatus
  const currentStatus = statuses.find(status => status.id === order.status_id) || {
    id: order.status_id,
    name: 'Неизвестный статус',
    color: '#6B7280'
  };

  // Обработка клика вне компонента
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Кнопка текущего статуса */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled && (isAdmin || order.status_id !== 4)) {
              setIsOpen(!isOpen);
            }
          }}
          disabled={disabled || isLoading || (!isAdmin && order.status_id === 4)}
          className={`
            inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
            transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
            ${getStatusColor(currentStatus.name)}
            ${(disabled || isLoading || (!isAdmin && order.status_id === 4)) 
              ? 'opacity-75 cursor-not-allowed' 
              : 'cursor-pointer hover:scale-105'}
          `}
        >
          {isLoading ? (
            <>
              <LoadingIcon />
              <span className="ml-1">...</span>
            </>
          ) : (
            <>
              <span>{currentStatus.name}</span>
              {!disabled && (isAdmin || order.status_id !== 4) && <ChevronDownIcon />}
            </>
          )}
        </button>

        {/* Выпадающий список */}
        {isOpen && !isLoading && (
          <>
            <div 
              className="fixed inset-0 z-30 bg-black/5" 
              onClick={() => setIsOpen(false)}
            />
            
            <div className="absolute top-full left-0 z-40 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
              {statuses.map((status) => (
                <button
                  key={status.id}
                  onClick={() => handleStatusChange(status.id)}
                  className={`
                    w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 
                    flex items-center justify-between transition-colors
                    ${status.id === currentStatus.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  `}
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status.name)}`}>
                    {status.name}
                  </span>
                  {status.id === currentStatus.id && <CheckIcon />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ✅ ОБНОВЛЕННОЕ: Модальное окно для ввода причины отмены */}
      <CancellationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleCancellationConfirm}
        isLoading={isLoading}
      />
    </>
  );
}