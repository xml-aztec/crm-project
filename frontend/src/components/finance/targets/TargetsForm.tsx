import React from 'react';
import Button from '../../ui/button/Button';
import { TargetFormData, FormErrors } from './types';
import { MonthlyTarget } from '../../../store/api/monthlyTargetsApi';

interface User {
  id: number;
  full_name?: string;
  position?: {
    id: number;
    name: string;
  };
}

interface Month {
  value: string;
  label: string;
}

interface TargetsFormProps {
  formData: TargetFormData;
  errors: FormErrors;
  editingTarget: MonthlyTarget | null;
  availableMonths: Month[];
  managers: User[];
  isSubmitting: boolean;
  onFormDataChange: (data: TargetFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const TargetsForm: React.FC<TargetsFormProps> = ({
  formData,
  errors,
  editingTarget,
  availableMonths,
  managers,
  isSubmitting,
  onFormDataChange,
  onSubmit,
  onCancel
}) => {
  const handleInputChange = (field: keyof TargetFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {editingTarget ? 'Редактировать цель продаж' : 'Добавить новую цель продаж'}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Менеджер *
            </label>
            <select
              value={formData.manager_id}
              onChange={(e) => handleInputChange('manager_id', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.manager_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Выберите менеджера</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id.toString()}>
                  {manager.full_name || `Пользователь #${manager.id}`} - {manager.position?.name || 'Менеджер'}
                </option>
              ))}
            </select>
            {errors.manager_id && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.manager_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Месяц *
            </label>
            <select
              value={formData.month}
              onChange={(e) => handleInputChange('month', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.month ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={isSubmitting}
            >
              {availableMonths.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {errors.month && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.month}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Целевая сумма (сом) *
            </label>
            <input
              type="number"
              value={formData.target_amount}
              onChange={(e) => handleInputChange('target_amount', e.target.value)}
              placeholder="Введите целевую сумму"
              min="0"
              step="0.01"
              className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.target_amount ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={isSubmitting}
            />
            {errors.target_amount && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.target_amount}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                {editingTarget ? 'Обновление...' : 'Создание...'}
              </div>
            ) : (
              editingTarget ? 'Обновить цель' : 'Создать цель'
            )}
          </Button>
          {editingTarget && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TargetsForm;