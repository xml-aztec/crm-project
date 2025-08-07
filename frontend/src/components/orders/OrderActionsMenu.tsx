import { useRoleAccess } from '../../hooks/useRoleAccess';
import { Order } from '../../store/api/ordersApi';

interface OrderActionsMenuProps {
  order: Order;
  onEdit?: (order: Order) => void;
  onViewDetails?: (order: Order) => void; // Сделать опциональным
  onConfirm?: () => Promise<void>; // Сделать опциональным
  onDelete: (order: Order) => void;
  onPrint?: () => void; // Сделать опциональным
  onExport?: () => void; // Сделать опциональным
  className?: string;
}

// Иконки
const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const PrintIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function OrderActionsMenu({
  order,
  onEdit,
  onViewDetails,
  onConfirm,
  onDelete,
  onPrint,
  onExport,
  className = ''
}: OrderActionsMenuProps) {
  const { isAdmin, isManager } = useRoleAccess();

  // Проверяем, можно ли редактировать заказ (админ + менеджер, неподтвержденные)
  const canEdit = (isAdmin || isManager) && !order.confirmed && order.status_id !== 4;
  
  // Проверяем, можно ли удалить заказ (только админ, неподтвержденные)
  const canDelete = isAdmin && !order.confirmed && order.status_id !== 4;

  // Проверяем, можно ли подтвердить заказ
  const canConfirm = (isAdmin || isManager) && !order.confirmed && order.status_id !== 4;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Кнопка просмотра деталей */}
      {onViewDetails && (
        <button
          onClick={() => onViewDetails(order)}
          className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-colors duration-150"
          title="Просмотреть детали заказа"
        >
          <EyeIcon />
        </button>
      )}

      {/* Кнопка редактирования - доступна админу и менеджеру */}
      {canEdit && onEdit && (
        <button
          onClick={() => onEdit(order)}
          className="flex items-center justify-center w-8 h-8 text-indigo-600 hover:text-indigo-800 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 dark:hover:text-indigo-300 rounded-lg transition-colors duration-150"
          title="Редактировать заказ"
        >
          <PencilIcon />
        </button>
      )}

      {/* Кнопка подтверждения - доступна админу и менеджеру */}
      {canConfirm && onConfirm && (
        <button
          onClick={onConfirm}
          className="flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 dark:hover:text-green-300 rounded-lg transition-colors duration-150"
          title="Подтвердить заказ"
        >
          <CheckIcon />
        </button>
      )}

      {/* Кнопка печати */}
      {onPrint && (
        <button
          onClick={onPrint}
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900/30 dark:hover:bg-gray-900/50 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg transition-colors duration-150"
          title="Печать заказа"
        >
          <PrintIcon />
        </button>
      )}

      {/* Кнопка экспорта */}
      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center justify-center w-8 h-8 text-purple-600 hover:text-purple-800 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400 dark:hover:text-purple-300 rounded-lg transition-colors duration-150"
          title="Экспорт заказа"
        >
          <DownloadIcon />
        </button>
      )}

      {/* Кнопка удаления - доступна только админу */}
      {canDelete && (
        <button
          onClick={() => onDelete(order)}
          className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 dark:hover:text-red-300 rounded-lg transition-colors duration-150"
          title="Удалить заказ"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}