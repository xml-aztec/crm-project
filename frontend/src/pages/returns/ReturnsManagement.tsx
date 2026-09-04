import { useState } from 'react';
import { getApiErrorMessage } from '../../types/apiError';
import { asApiError } from '../../types/apiError';
import { useNavigate } from 'react-router';
import { useGetReturnsQuery, useDecideReturnMutation, OrderReturn, ReturnStatus } from '../../store/api/returnsApi';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import Button from '../../components/ui/button/Button';
import { formatDateTime } from '../../utils/dateUtils';

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

const TABS: { id: 'all' | ReturnStatus; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'requested', label: 'Ожидают подтверждения' },
  { id: 'approved', label: 'Подтверждённые' },
  { id: 'rejected', label: 'Отклонённые' },
  { id: 'completed', label: 'Выполненные' },
];

function ReturnCard({ orderReturn }: { orderReturn: OrderReturn }) {
  const navigate = useNavigate();
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => navigate(`/orders/${orderReturn.order_id}`)}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Заказ #{orderReturn.order_id} →
        </button>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.className}`}>
          {meta.label}
        </span>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        {formatDateTime(orderReturn.created_at)}
        {orderReturn.created_by_user && ` · ${orderReturn.created_by_user.full_name || orderReturn.created_by_user.email}`}
      </div>

      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
        {orderReturn.items.map((item) => (
          <li key={item.id}>
            {item.quantity} шт. «{item.order_item.product?.name || `Товар #${item.order_item.product_id}`}» (
            {CONDITION_LABELS[item.condition] || item.condition})
          </li>
        ))}
      </ul>

      {orderReturn.reason && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Причина: {orderReturn.reason}</p>
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

export default function ReturnsManagement() {
  const [activeTab, setActiveTab] = useState<'all' | ReturnStatus>('requested');

  const { data: returns = [], isLoading, error } = useGetReturnsQuery(
    activeTab === 'all' ? undefined : { status: activeTab }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Возвраты</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Возвраты по заказам и их статус подтверждения
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400 text-center py-12">Ошибка загрузки возвратов</p>
      ) : returns.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">Возвраты не найдены</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {returns.map((ret) => (
            <ReturnCard key={ret.id} orderReturn={ret} />
          ))}
        </div>
      )}
    </div>
  );
}
