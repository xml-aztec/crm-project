import React from 'react';
import { MonthlyTarget } from '../../../store/api/monthlyTargetsApi';

interface ManagerInfo {
  name: string;
  position: string;
  initials: string;
}

interface TargetsTableProps {
  targets: MonthlyTarget[];
  isLoading: boolean;
  error: any;
  formatAmount: (amount: number) => string;
  formatMonth: (monthStr: string) => string;
  getManagerInfo: (managerId: number) => ManagerInfo;
  getCompletionColor: (percentage: number) => string;
  onEdit: (target: MonthlyTarget) => void;
  onDelete: (target: MonthlyTarget) => void;
  isDeletingTarget: boolean;
}

const TargetsTable: React.FC<TargetsTableProps> = ({
  targets,
  isLoading,
  error,
  formatAmount,
  formatMonth,
  getManagerInfo,
  onEdit,
  onDelete,
  isDeletingTarget
}) => {
  const getCompletionBadge = (percentage: number) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    
    if (percentage >= 100) {
      return (
        <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`}>
          ✅ Выполнено ({percentage}%)
        </span>
      );
    } else if (percentage >= 80) {
      return (
        <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400`}>
          ⚡ Близко к цели ({percentage}%)
        </span>
      );
    } else if (percentage >= 50) {
      return (
        <span className={`${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400`}>
          📈 В процессе ({percentage}%)
        </span>
      );
    } else {
      return (
        <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`}>
          ⚠️ Требует внимания ({percentage}%)
        </span>
      );
    }
  };

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Ошибка загрузки
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Не удалось загрузить список целей продаж
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : targets.length === 0 ? (
        <div className="p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Цели продаж не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Создайте первую цель продаж для менеджера. Цели помогают отслеживать 
              выполнение планов и мотивировать команду к достижению результатов.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Менеджер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Период
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Цель
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Факт
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Выполнение
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Создано
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {targets.map((target) => {
                const managerInfo = getManagerInfo(target.manager_id);
                return (
                  <tr key={target.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {managerInfo.initials}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {managerInfo.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {managerInfo.position}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatMonth(target.month)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(target.target_amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {target.actual_amount ? formatAmount(target.actual_amount) : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCompletionBadge(target.achievement_percentage || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {target.created_at ? (
                        new Date(target.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric'
                        })
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(target)}
                          disabled={isDeletingTarget}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="Редактировать цель"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(target)}
                          disabled={isDeletingTarget}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Удалить цель"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TargetsTable;