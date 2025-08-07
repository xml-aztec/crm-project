import React from 'react';
import Button from '../../ui/button/Button';

interface User {
  id: number;
  full_name?: string;
  name?: string;
  position?: {
    id: number;
    name: string;
  };
}

interface Month {
  value: string;
  label: string;
}

interface TargetsFiltersProps {
  selectedMonth: string;
  selectedManager: string;
  availableMonths: Month[];
  managers: User[];
  onMonthChange: (month: string) => void;
  onManagerChange: (managerId: string) => void;
}

const TargetsFilters: React.FC<TargetsFiltersProps> = ({
  selectedMonth,
  selectedManager,
  availableMonths,
  managers,
  onMonthChange,
  onManagerChange
}) => {
  const handleResetFilters = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(currentMonth);
    onManagerChange('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Фильтры и поиск
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Период
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableMonths.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Менеджер
          </label>
          <select
            value={selectedManager}
            onChange={(e) => onManagerChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Все менеджеры</option>
            {managers.map(manager => (
              <option key={manager.id} value={manager.id.toString()}>
                {manager.full_name || manager.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleResetFilters}
            variant="outline"
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Сбросить фильтры
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TargetsFilters;