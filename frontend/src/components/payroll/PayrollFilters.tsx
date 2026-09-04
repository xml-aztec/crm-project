import React, { useState, useCallback, useMemo } from 'react';
import { PayrollFilters } from '../../store/api/payrollApi';
import { UserRead } from '../../store/api/usersManagementApi';
import Button from '../ui/button/Button';

interface PayrollFiltersComponentProps {
  filters: PayrollFilters;
  onFiltersChange: (filters: PayrollFilters) => void;
  users: UserRead[];
}

const PayrollFiltersComponent: React.FC<PayrollFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  users
}) => {
  const [localFilters, setLocalFilters] = useState<PayrollFilters>(filters);

  // ✅ УЛУЧШАЕМ: Мемоизированный список менеджеров с лучшей фильтрацией
  const managers = useMemo(() => {
    return users.filter(user => {
      // Проверяем по названию роли
      const roleMatch = user.role?.name?.toLowerCase().includes('менеджер') ||
                       user.role?.name?.toLowerCase().includes('manager');
      
      // Проверяем по названию должности
      const positionMatch = user.position?.name?.toLowerCase().includes('менеджер') ||
                           user.position?.name?.toLowerCase().includes('manager');
      
      // Проверяем по role_id (если знаем, что 2 = менеджер)
      const roleIdMatch = user.role_id === 2;
      
      return roleMatch || positionMatch || roleIdMatch;
    }).sort((a, b) => {
      // Сортируем по имени для удобства
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
  }, [users]);

  // ✅ ДОБАВЛЯЕМ: Функция для безопасного получения имени пользователя
  const getUserDisplayName = (user: UserRead) => {
    return user.full_name || `Пользователь ID: ${user.id}`;
  };

  // Обработчик изменения фильтров
  const handleFilterChange = useCallback(<K extends keyof PayrollFilters>(field: K, value: PayrollFilters[K]) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  }, [localFilters, onFiltersChange]);

  // Очистка фильтров
  const clearFilters = useCallback(() => {
    const clearedFilters: PayrollFilters = {
      month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      only_paid: undefined,
      user_id: undefined,
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  }, [onFiltersChange]);

  // Проверка наличия активных фильтров
  const hasActiveFilters = useMemo(() => {
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    return localFilters.month !== currentMonth || 
           localFilters.only_paid !== undefined || 
           localFilters.user_id !== undefined;
  }, [localFilters]);

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

  // ✅ ДОБАВЛЯЕМ: Функция для получения имени выбранного менеджера
  const getSelectedManagerName = () => {
    const manager = managers.find(m => m.id === localFilters.user_id);
    return manager ? `${manager.full_name} (${manager.position?.name})` : '';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Месяц */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Месяц начисления
            </label>
            <select
              value={localFilters.month || ''}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Выберите месяц</option>
              {monthOptions.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Статус выплаты */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Статус выплаты
            </label>
            <select
              value={localFilters.only_paid === undefined ? '' : localFilters.only_paid.toString()}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange('only_paid', value === '' ? undefined : value === 'true');
              }}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все записи</option>
              <option value="true">Только выплаченные</option>
              <option value="false">Только не выплаченные</option>
            </select>
          </div>

          {/* Менеджер */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Менеджер
            </label>
            <select
              value={localFilters.user_id || ''}
              onChange={(e) => handleFilterChange('user_id', e.target.value ? parseInt(e.target.value) : undefined)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все менеджеры</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {getUserDisplayName(manager)} 
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Кнопка очистки фильтров */}
        {hasActiveFilters && (
          <div className="flex-shrink-0">
            <Button
              variant="outline" 
              size="sm"
              onClick={clearFilters}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Очистить
            </Button>
          </div>
        )}
      </div>

      {/* Индикатор активных фильтров */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {localFilters.month && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                Месяц: {monthOptions.find(m => m.value === localFilters.month)?.label}
                <button onClick={() => handleFilterChange('month', undefined)}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {localFilters.only_paid !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                {localFilters.only_paid ? 'Выплаченные' : 'Не выплаченные'}
                <button onClick={() => handleFilterChange('only_paid', undefined)}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {localFilters.user_id && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                Менеджер: {getSelectedManagerName()}
                <button onClick={() => handleFilterChange('user_id', undefined)}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollFiltersComponent;