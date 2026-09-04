import React from 'react';
import { KPIRule } from '../../../store/api/kpiRulesApi';

interface KPIRulesTableProps {
  rules: KPIRule[];
  isLoading: boolean;
  error: unknown;
  formatAmount: (amount: number) => string;
  onEdit: (rule: KPIRule) => void;
  onDelete: (rule: KPIRule) => void;
  isDeletingRule: boolean;
}

const KPIRulesTable: React.FC<KPIRulesTableProps> = ({
  rules,
  isLoading,
  error,
  formatAmount,
  onEdit,
  onDelete,
  isDeletingRule
}) => {
  const getRuleBadge = (rule: KPIRule) => {
    const hasBonus = rule.bonus > 0;
    const hasPenalty = rule.penalty > 0;
    
    if (hasBonus && hasPenalty) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          💰 Бонус/Штраф
        </span>
      );
    } else if (hasBonus) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          💚 Только бонус
        </span>
      );
    } else if (hasPenalty) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          ❌ Только штраф
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
          ⚪ Без мотивации
        </span>
      );
    }
  };

  const getEffectivenessColor = (rule: KPIRule) => {
    const hasBonus = rule.bonus > 0;
    const hasPenalty = rule.penalty > 0;
    
    if (hasBonus && hasPenalty) {
      return 'text-blue-600 dark:text-blue-400';
    } else if (hasBonus) {
      return 'text-green-600 dark:text-green-400';
    } else if (hasPenalty) {
      return 'text-red-600 dark:text-red-400';
    } else {
      return 'text-gray-500 dark:text-gray-400';
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
            Не удалось загрузить список правил KPI
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
      ) : rules.length === 0 ? (
        <div className="p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Правила KPI не настроены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Создайте первое правило KPI для автоматического расчета бонусов и штрафов менеджеров 
              на основе выполнения целей продаж.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Минимальный %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Бонус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Штраф
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Тип правила
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Эффективность
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
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {rule.min_percent}%
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          От {rule.min_percent}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Минимальный порог
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {rule.bonus > 0 ? formatAmount(rule.bonus) : '—'}
                    </div>
                    {rule.bonus > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        При достижении
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-red-600 dark:text-red-400">
                      {rule.penalty > 0 ? formatAmount(rule.penalty) : '—'}
                    </div>
                    {rule.penalty > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        При невыполнении
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRuleBadge(rule)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getEffectivenessColor(rule)}`}>
                      {rule.bonus > 0 && rule.penalty > 0 ? 'Высокая' : 
                       rule.bonus > 0 ? 'Мотивирующая' : 
                       rule.penalty > 0 ? 'Дисциплинирующая' : 'Низкая'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {rule.bonus > 0 && rule.penalty > 0 ? 'Бонус + штраф' : 
                       rule.bonus > 0 ? 'Только бонус' : 
                       rule.penalty > 0 ? 'Только штраф' : 'Нет мотивации'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {rule.created_at ? (
                      new Date(rule.created_at).toLocaleDateString('ru-RU', {
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
                        onClick={() => onEdit(rule)}
                        disabled={isDeletingRule}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Редактировать правило"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(rule)}
                        disabled={isDeletingRule}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Удалить правило"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KPIRulesTable;