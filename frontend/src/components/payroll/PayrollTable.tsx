import { useMemo, useState } from 'react';
import { Payroll } from '../../types/payroll';
import Button from '../ui/button/Button';
import { useUniversalFormatters } from '../../hooks/useUniversalFormatters';

// ✅ Исправляем интерфейс - убираем лишние свойства
interface PayrollTableProps {
  payrolls: Payroll[];
  onEdit: (payroll: Payroll) => void;
  onPay: (payroll: Payroll, comment?: string) => void;
  onRecalculate: (payroll: Payroll) => void;
  onDelete: (payroll: Payroll) => void;
  isLoading?: boolean;
}

export default function PayrollTable({ 
  payrolls, 
  onEdit, 
  onPay, 
  onRecalculate, 
  onDelete, 
  isLoading = false 
}: PayrollTableProps) {
  // Используем централизованные форматтеры
  const formatters = useUniversalFormatters();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showPayComment, setShowPayComment] = useState<number | null>(null);
  const [payComment, setPayComment] = useState('');

  // Сортировка по дате создания (новые сверху)
  const sortedPayrolls = useMemo(() => {
    return [...payrolls].sort((a, b) => 
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  }, [payrolls]);

  const handlePayWithComment = (payroll: Payroll) => {
    onPay(payroll, payComment);
    setShowPayComment(null);
    setPayComment('');
  };

  const handleDeleteConfirm = (payroll: Payroll) => {
    onDelete(payroll);
    setShowDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"></div>
          ))}
        </div>
      </div>
    );
  }

  if (payrolls.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium mb-2">Зарплатные ведомости не найдены</p>
          <p className="text-sm">Создайте первую зарплатную ведомость для отображения данных</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Зарплатные ведомости ({payrolls.length})
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Сотрудник
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Месяц
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Базовая зарплата
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Доп. выплаты
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                KPI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Итого к выплате
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Дата создания
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPayrolls.map((payroll) => (
              <tr key={payroll.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatters.safe(payroll.user?.full_name, `Пользователь #${payroll.user_id}`)}
                  </div>
                  {/* ✅ Безопасная проверка email с учетом union типов */}
                  {payroll.user?.email && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {payroll.user.email}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatters.month(payroll.month)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatters.amount(payroll.base_salary)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {/* ✅ Добавляем защиту от undefined */}
                    {(payroll.bonus_amount ?? 0) > 0 && (
                      <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {formatters.amount(payroll.bonus_amount)}
                      </div>
                    )}
                    {(payroll.penalty_amount ?? 0) > 0 && (
                      <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        {formatters.amount(payroll.penalty_amount)}
                      </div>
                    )}
                    {(payroll.bonus_amount ?? 0) === 0 && (payroll.penalty_amount ?? 0) === 0 && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        Отсутствуют
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {payroll.kpi_percent ? (
                    <div className="flex items-center">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payroll.kpi_percent >= 100 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : payroll.kpi_percent >= 80
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {formatters.percent(payroll.kpi_percent, 0)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatters.amount(payroll.total_paid)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {payroll.paid_at ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      ✓ Выплачено
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                      ⏳ Ожидает
                    </span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatters.dateTime(payroll.created_at)}
                  </div>
                  {payroll.paid_at && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Выплачено: {formatters.dateTime(payroll.paid_at)}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {!payroll.paid_at && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(payroll)}
                          className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Редактировать
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPayComment(payroll.id)}
                          className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Выплатить
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRecalculate(payroll)}
                          className="text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Пересчитать
                        </Button>
                        
                        {/* ✅ ИСПРАВЛЯЕМ: Используем правильный variant */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(payroll.id)}
                          className="text-white bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Удалить
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модальное окно для подтверждения выплаты с комментарием */}
      {showPayComment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Подтвердить выплату
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Вы действительно хотите отметить зарплату как выплаченную?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Комментарий (необязательно)
              </label>
              <textarea
                value={payComment}
                onChange={(e) => setPayComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Добавьте комментарий к выплате..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPayComment(null);
                  setPayComment('');
                }}
              >
                Отмена
              </Button>
              {/* ✅ ИСПРАВЛЯЕМ: Используем правильный variant и исправляем JSX */}
              <Button
                variant="primary"
                onClick={() => {
                  const payroll = payrolls.find(p => p.id === showPayComment);
                  if (payroll) handlePayWithComment(payroll);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Подтвердить выплату
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Подтвердить удаление
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Вы действительно хотите удалить эту зарплатную ведомость? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Отмена
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const payroll = payrolls.find(p => p.id === showDeleteConfirm);
                  if (payroll) handleDeleteConfirm(payroll);
                }}
                className="text-white bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}