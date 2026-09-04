import React, { useState, useMemo, useCallback } from 'react';
import { getApiErrorMessage, ApiValidationIssue } from '../../types/apiError';
import { asApiError } from '../../types/apiError';
import {
  useGetMonthlyTargetsQuery,
  useCreateOrUpdateMonthlyTargetMutation,
  useDeleteMonthlyTargetMutation,
  MonthlyTarget,
  CreateMonthlyTargetRequest
} from '../../store/api/monthlyTargetsApi';
import { useGetAllUsersQuery, UserRead } from '../../store/api/usersManagementApi';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';

interface MonthlyTargetsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MonthlyTargetsManager: React.FC<MonthlyTargetsManagerProps> = ({ isOpen, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [formData, setFormData] = useState<CreateMonthlyTargetRequest>({
    manager_id: 0,
    month: selectedMonth,
    target_amount: 0
  });
  
  const [editingTarget, setEditingTarget] = useState<MonthlyTarget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MonthlyTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API хуки
  const { data: targets = [], isLoading: targetsLoading } = useGetMonthlyTargetsQuery({});
  const { data: users = [], isLoading: usersLoading } = useGetAllUsersQuery();
  const [createOrUpdateTarget, { isLoading: isSubmitting }] = useCreateOrUpdateMonthlyTargetMutation();
  const [deleteTarget, { isLoading: isDeleting }] = useDeleteMonthlyTargetMutation();

  // Используем всех активных пользователей
  const availableUsers = useMemo(() => {
    return users.filter((user: UserRead) => user.is_active);
  }, [users]);

  // Функция для извлечения YYYY-MM из YYYY-MM-01
  const extractYearMonth = (month: string) => {
    return month.substring(0, 7); // Получаем YYYY-MM из YYYY-MM-01
  };

  // Фильтрация целей по выбранному месяцу
  const filteredTargets = useMemo(() => {
    return targets.filter(target => {
      const targetMonth = extractYearMonth(target.month);
      return targetMonth === selectedMonth;
    });
  }, [targets, selectedMonth]);

  // Пользователи, для которых уже есть цель в выбранном месяце
  const usedManagerIds = useMemo(() => {
    return new Set(filteredTargets.map(target => target.manager_id));
  }, [filteredTargets]);

  // Доступные пользователи для создания новой цели
  const availableForNewTarget = useMemo(() => {
    return availableUsers.filter((user: UserRead) => !usedManagerIds.has(user.id));
  }, [availableUsers, usedManagerIds]);

  // Форматирование суммы
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' сом';
  };

  // Форматирование месяца для отображения
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  };

  // Получение имени пользователя
  const getUserName = useCallback((managerId: number) => {
    const user = availableUsers.find((u: UserRead) => u.id === managerId);
    return user?.full_name || `Менеджер #${managerId}`;
  }, [availableUsers]);

  // Получение должности пользователя
  const getUserPosition = useCallback((managerId: number) => {
    const user = availableUsers.find((u: UserRead) => u.id === managerId);
    return user?.position?.name || 'Не указано';
  }, [availableUsers]);

  // Получение роли пользователя
  const getUserRole = useCallback((managerId: number) => {
    const user = availableUsers.find((u: UserRead) => u.id === managerId);
    return user?.role?.name || 'Не указано';
  }, [availableUsers]);

  // Расчет процента выполнения (если есть actual_amount)
  const getAchievementPercentage = useCallback((target: MonthlyTarget) => {
    if (!target.actual_amount || target.target_amount === 0) return 0;
    return Math.round((target.actual_amount / target.target_amount) * 100);
  }, []);

  // Цвет индикатора выполнения
  const getAchievementColor = useCallback((percentage: number) => {
    if (percentage >= 100) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Валидация данных
    if (!formData.manager_id || formData.target_amount <= 0) {
      setError('Пожалуйста, выберите сотрудника и укажите корректную сумму цели');
      return;
    }

    // Проверяем корректность месяца
    if (!formData.month || !/^\d{4}-\d{2}$/.test(formData.month)) {
      setError('Некорректный формат месяца');
      return;
    }

    const requestData = {
      manager_id: formData.manager_id,
      month: formData.month,
      target_amount: formData.target_amount
    };

    try {
      await createOrUpdateTarget(requestData).unwrap();
      
      // Сброс формы
      setFormData({
        manager_id: 0,
        month: selectedMonth,
        target_amount: 0
      });
      setEditingTarget(null);
      setError(null);
    } catch (rawError) {
      const error = asApiError(rawError);
      // Обработка различных типов ошибок
      if (error?.status === 422 && error?.data?.detail) {
        if (Array.isArray(error?.data?.detail)) {
          const errorMessages = (error?.data?.detail as ApiValidationIssue[]).map((err) => err.msg ?? 'некорректное значение').join(', ');
          setError(`Ошибка валидации: ${errorMessages}`);
        } else {
          setError(`Ошибка валидации: ${getApiErrorMessage(error, 'Произошла ошибка')}`);
        }
      } else if (error?.status === 500) {
        setError('Внутренняя ошибка сервера. Пожалуйста, обратитесь к администратору.');
      } else if (error?.status === 409) {
        setError('Цель для этого сотрудника на выбранный месяц уже существует.');
      } else if (error?.data?.message) {
        setError(error.data.message);
      } else if (getApiErrorMessage(error, 'Произошла ошибка')) {
        setError(typeof getApiErrorMessage(error, 'Произошла ошибка')=== 'string' ? getApiErrorMessage(error, 'Произошла ошибка'): 'Произошла ошибка при сохранении цели');
      } else {
        setError('Произошла ошибка при сохранении цели. Проверьте подключение к серверу.');
      }
    }
  };

  const handleEdit = (target: MonthlyTarget) => {
    setEditingTarget(target);
    setFormData({
      manager_id: target.manager_id,
      month: extractYearMonth(target.month), // Преобразуем обратно в YYYY-MM для UI
      target_amount: target.target_amount
    });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingTarget(null);
    setFormData({
      manager_id: 0,
      month: selectedMonth,
      target_amount: 0
    });
    setError(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteTarget(deleteConfirm.id).unwrap();
      setDeleteConfirm(null);
      setError(null);
    } catch {
      setError('Произошла ошибка при удалении цели');
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setFormData(prev => ({ ...prev, month: newMonth }));
    setEditingTarget(null);
    setError(null);
  };

  // Общая сумма целей за месяц
  const totalTargets = useMemo(() => {
    return filteredTargets.reduce((sum, target) => sum + target.target_amount, 0);
  }, [filteredTargets]);

  // Общая сумма фактических продаж за месяц
  const totalActual = useMemo(() => {
    return filteredTargets.reduce((sum, target) => sum + (target.actual_amount || 0), 0);
  }, [filteredTargets]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Управление целями продаж сотрудников
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Сообщение об ошибке */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Выбор месяца */}
        <div className="mb-6">
          <Label>Период планирования</Label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Период
            </h4>
            <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {formatMonth(selectedMonth)}
            </p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-green-600 dark:text-green-400">
              Сотрудников с целями
            </h4>
            <p className="text-lg font-semibold text-green-900 dark:text-green-100">
              {filteredTargets.length}
            </p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Общий план
            </h4>
            <p className="text-lg font-semibold text-purple-900 dark:text-purple-100">
              {formatAmount(totalTargets)}
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Фактические продажи
            </h4>
            <p className="text-lg font-semibold text-orange-900 dark:text-orange-100">
              {formatAmount(totalActual)}
            </p>
            {totalTargets > 0 && (
              <p className={`text-sm font-medium ${getAchievementColor(Math.round((totalActual / totalTargets) * 100))}`}>
                {Math.round((totalActual / totalTargets) * 100)}% выполнения
              </p>
            )}
          </div>
        </div>

        {/* Форма создания/редактирования цели */}
        {(!editingTarget ? availableForNewTarget.length > 0 : true) && (
          <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingTarget ? 'Редактировать цель продаж' : 'Создать новую цель продаж'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Сотрудник</Label>
                {editingTarget ? (
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-gray-900 dark:text-white">
                    <div className="font-medium">{getUserName(editingTarget.manager_id)}</div>
                    <div className="text-sm text-gray-500">
                      {getUserPosition(editingTarget.manager_id)} | {getUserRole(editingTarget.manager_id)}
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, manager_id: parseInt(e.target.value) }))}
                    disabled={isSubmitting || usersLoading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value={0}>Выберите сотрудника</option>
                    {availableForNewTarget.map((user: UserRead) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} - {user.position?.name || 'Без должности'} ({user.role?.name || 'Без роли'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <Label>Цель продаж (сом)</Label>
                <Input
                  type="text"
                  value={formData.target_amount || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, target_amount: parseInt(value) || 0 }));
                  }}
                  placeholder="Введите целевую сумму"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    isSubmitting || 
                    (!editingTarget && formData.manager_id === 0) || 
                    formData.target_amount <= 0
                  }
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 border-2 border-t-brand-200 border-r-brand-200 border-b-brand-500 border-l-brand-500 rounded-full animate-spin"></span>
                      {editingTarget ? 'Обновление...' : 'Создание...'}
                    </>
                  ) : (
                    editingTarget ? 'Обновить цель' : 'Создать цель'
                  )}
                </Button>
                
                {editingTarget && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Отмена
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Список целей */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Цели продаж на {formatMonth(selectedMonth)} ({filteredTargets.length})
          </h3>
          
          {targetsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Цели продаж на этот период не найдены
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Сотрудник
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Должность
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Роль
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Цель продаж
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Фактические продажи
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Выполнение
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTargets.map((target) => {
                    const achievementPercentage = getAchievementPercentage(target);
                    return (
                      <tr key={target.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getUserName(target.manager_id)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {getUserPosition(target.manager_id)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {getUserRole(target.manager_id)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatAmount(target.target_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {target.actual_amount ? formatAmount(target.actual_amount) : 'Нет данных'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-medium ${getAchievementColor(achievementPercentage)}`}>
                                  {achievementPercentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    achievementPercentage >= 100 ? 'bg-green-500' :
                                    achievementPercentage >= 80 ? 'bg-yellow-500' :
                                    achievementPercentage >= 50 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(achievementPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(target)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              disabled={isSubmitting}
                              title="Редактировать"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(target)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              disabled={isSubmitting}
                              title="Удалить"
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

        {/* Информационное сообщение */}
        {availableForNewTarget.length === 0 && !editingTarget && !usersLoading && availableUsers.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Для всех активных сотрудников уже созданы цели продаж на выбранный период.
            </p>
          </div>
        )}

        {availableUsers.length === 0 && !usersLoading && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              В системе не найдено активных пользователей.
            </p>
          </div>
        )}

        {usersLoading && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
            <p className="text-sm text-gray-800 dark:text-gray-200 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-brand-500 mr-2"></div>
              Загрузка пользователей...
            </p>
          </div>
        )}

        {/* Модальное окно подтверждения удаления */}
        <DeleteConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Удалить цель продаж"
          itemName={deleteConfirm ? `${getUserName(deleteConfirm.manager_id)} (${formatMonth(extractYearMonth(deleteConfirm.month))})` : ''}
          confirmText="Удалить"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default MonthlyTargetsManager;