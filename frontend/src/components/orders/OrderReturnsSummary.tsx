import { useState } from 'react';
import { asApiError, getApiErrorMessage } from '../../types/apiError';
import { useGetReturnsQuery, useDecideReturnMutation, OrderReturn, ReturnStatus } from '../../store/api/returnsApi';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import Button from '../ui/button/Button';
import { formatDateTime } from '../../utils/dateUtils';

interface OrderReturnsSummaryProps {
  orderId: number;
  className?: string;
}

const STATUS_META: Record<ReturnStatus, { label: string; className: string }> = {
  requested: {
    label: 'Ожидает подтверждения',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  },
  approved: {
    label: 'Подтверждён',
    className: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  },
  rejected: {
    label: 'Отклонён',
    className: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  },
  completed: {
    label: 'Выполнен',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  },
};

const CONDITION_LABELS: Record<string, string> = {
  resalable: 'годный',
  defective: 'брак',
};

function ReturnRow({ orderReturn }: { orderReturn: OrderReturn }) {
  const { isManager } = useRoleAccess();
  const [decideReturn, { isLoading }] = useDecideReturnMutation();
  const [error, setError] = useState<string | null>(null);
  const meta = STATUS_META[orderReturn.status];

  const handleDecision = async (approve: boolean) => {
    setError(null);
    try {
      await decideReturn({ id: orderReturn.id, approve }).unwrap();
    } catch (rawErr) {
      const err = asApiError(rawErr);
      setError(getApiErrorMessage(err, 'Не удалось сохранить решение'));
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.className}`}>
          {meta.label}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDateTime(orderReturn.created_at)}
          {orderReturn.created_by_user && ` · ${orderReturn.created_by_user.full_name || orderReturn.created_by_user.email}`}
        </span>
      </div>

      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
        {orderReturn.items.map((item) => (
          <li key={item.id}>
            {item.quantity} шт. «{item.order_item.product?.name || `Товар #${item.order_item.product_id}`}» (
            {CONDITION_LABELS[item.condition] || item.condition})
            {item.reason && <span className="text-gray-400 dark:text-gray-500"> — {item.reason}</span>}
          </li>
        ))}
      </ul>

      {orderReturn.reason && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Причина: {orderReturn.reason}</p>
      )}

      {orderReturn.approved_by_user && orderReturn.status !== 'requested' && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {orderReturn.status === 'rejected' ? 'Отклонил' : 'Подтвердил'}:{' '}
          {orderReturn.approved_by_user.full_name || orderReturn.approved_by_user.email}
        </p>
      )}

      {orderReturn.status === 'requested' && isManager && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => handleDecision(true)} disabled={isLoading}>
            Подтвердить
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDecision(false)} disabled={isLoading}>
            Отклонить
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default function OrderReturnsSummary({ orderId, className = '' }: OrderReturnsSummaryProps) {
  const { data: returns = [], isLoading, error } = useGetReturnsQuery({ order_id: orderId });

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
        <p className="text-sm text-red-600 dark:text-red-400 text-center">Ошибка загрузки возвратов</p>
      </div>
    );
  }

  if (returns.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          ↩️ Возвраты по заказу
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {returns.length}
          </span>
        </h3>
      </div>
      <div className="p-6 space-y-4">
        {returns.map((ret) => (
          <ReturnRow key={ret.id} orderReturn={ret} />
        ))}
      </div>
    </div>
  );
}
