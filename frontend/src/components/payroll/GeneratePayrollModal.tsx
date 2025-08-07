import React, { useState, useMemo } from 'react';
import Button from '../ui/button/Button';

interface GeneratePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (month: string) => void;
  isLoading: boolean;
}

const GeneratePayrollModal: React.FC<GeneratePayrollModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isLoading
}) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // По умолчанию выбираем текущий месяц
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Генерация списка месяцев (последние 12 месяцев + следующие 3)
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Добавляем последние 12 месяцев
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long' 
      });
      months.push({ value, label });
    }
    
    // Добавляем следующие 3 месяца
    for (let i = 1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long' 
      });
      months.push({ value, label });
    }
    
    return months;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonth) {
      onGenerate(selectedMonth);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{ zIndex: 99999 }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 relative z-[99999]"
        style={{ zIndex: 99999 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Генерация зарплат
          </h3>
          {!isLoading && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Выберите месяц для генерации зарплат
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
              >
                <option value="">Выберите месяц</option>
                {monthOptions.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Что будет происходить:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Система автоматически создаст записи зарплат для всех менеджеров</li>
                    <li>• Базовая ставка будет взята из профиля сотрудника</li>
                    <li>• KPI и бонусы можно будет настроить после генерации</li>
                    <li>• Существующие записи за этот месяц не будут затронуты</li>
                  </ul>
                </div>
              </div>
            </div>

            {selectedMonth && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Выбранный период:</strong>{' '}
                  {monthOptions.find(m => m.value === selectedMonth)?.label}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              type="submit"
              disabled={!selectedMonth || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                  Генерация...
                </div>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Сгенерировать зарплаты
                </>
              )}
            </Button>
            {!isLoading && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Отмена
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneratePayrollModal;