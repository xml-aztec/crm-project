import React from 'react';
import Button from '../../ui/button/Button';
import { RuleFormData, RuleFormErrors } from './types';
import { KPIRule } from '../../../store/api/kpiRulesApi';

interface KPIRulesFormProps {
  formData: RuleFormData;
  errors: RuleFormErrors;
  editingRule: KPIRule | null;
  isSubmitting: boolean;
  onFormDataChange: (data: RuleFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const KPIRulesForm: React.FC<KPIRulesFormProps> = ({
  formData,
  errors,
  editingRule,
  isSubmitting,
  onFormDataChange,
  onSubmit,
  onCancel
}) => {
  const handleInputChange = (field: keyof RuleFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {editingRule ? 'Редактировать правило KPI' : 'Добавить новое правило KPI'}
      </h3>
      
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          💡 Как работают правила KPI
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-400">
          Правила определяют, какие бонусы или штрафы получает менеджер в зависимости от процента выполнения цели продаж. 
          Например: при выполнении от 80% — бонус 5000 сом, при выполнении менее 50% — штраф 2000 сом.
        </p>
      </div>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Минимальный процент выполнения *
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.min_percent}
                onChange={(e) => handleInputChange('min_percent', e.target.value)}
                placeholder="Введите процент"
                min="0"
                max="1000"
                step="0.1"
                className={`block w-full pl-3 pr-8 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.min_percent ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
              </div>
            </div>
            {errors.min_percent && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.min_percent}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Минимальный процент для применения этого правила
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Размер бонуса (сом) *
            </label>
            <input
              type="number"
              value={formData.bonus}
              onChange={(e) => handleInputChange('bonus', e.target.value)}
              placeholder="Введите размер бонуса"
              min="0"
              step="0.01"
              className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.bonus ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={isSubmitting}
            />
            {errors.bonus && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bonus}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Бонус при достижении цели
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Размер штрафа (сом) *
            </label>
            <input
              type="number"
              value={formData.penalty}
              onChange={(e) => handleInputChange('penalty', e.target.value)}
              placeholder="Введите размер штрафа"
              min="0"
              step="0.01"
              className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.penalty ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={isSubmitting}
            />
            {errors.penalty && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.penalty}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Штраф при невыполнении цели
            </p>
          </div>
        </div>

        {/* Предпросмотр правила */}
        {formData.min_percent && formData.bonus && formData.penalty && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              📋 Предпросмотр правила
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              При выполнении цели от <span className="font-semibold text-blue-600 dark:text-blue-400">{formData.min_percent}%</span>:
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-sm">
                • <span className="text-green-600 dark:text-green-400 font-medium">Бонус: {parseFloat(formData.bonus).toLocaleString('ru-RU')} сом</span>
              </p>
              <p className="text-sm">
                • <span className="text-red-600 dark:text-red-400 font-medium">Штраф при невыполнении: {parseFloat(formData.penalty).toLocaleString('ru-RU')} сом</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                {editingRule ? 'Обновление...' : 'Создание...'}
              </div>
            ) : (
              editingRule ? 'Обновить правило' : 'Создать правило'
            )}
          </Button>
          {editingRule && (
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

export default KPIRulesForm;