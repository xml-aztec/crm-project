import { useRoleAccess } from '../../hooks/useRoleAccess';
import { Order } from '../../store/api/ordersApi';

interface OrderActionsMenuProps {
  order: Order;
  onEdit?: (order: Order) => void;
  onDelete: (order: Order) => void;
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

export default function OrderActionsMenu({
  order,
  onEdit,
  onDelete,
  className = ''
}: OrderActionsMenuProps) {
  const { isAdmin, isManager } = useRoleAccess();

  // Проверяем, можно ли редактировать заказ (админ + менеджер, неподтвержденные)
  const canEdit = (isAdmin || isManager) && !order.confirmed && order.status_id !== 4;
  
  // Проверяем, можно ли удалить заказ (только админ, неподтвержденные)
  const canDelete = isAdmin && !order.confirmed && order.status_id !== 4;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
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