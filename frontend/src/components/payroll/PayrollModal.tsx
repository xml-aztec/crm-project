import React, { useState, useEffect, useMemo } from 'react';
import {
  calculatePayrollTotal,
  kpiColorClass,
  validatePayrollForm,
} from '../../utils/payrollCalc';
import { getApiErrorMessage } from '../../types/apiError';
import { asApiError } from '../../types/apiError';
import { Payroll, PayrollCreate, PayrollUpdate } from '../../types/payroll';
import { useGetUsersQuery } from '../../store/api/usersApi';
import Button from '../ui/button/Button';
import { formatDateTime } from '../../utils/dateUtils';

// ✅ Обновляем интерфейсы
interface UserRead {
  id: number;
  full_name: string;
  email?: string;
  position?: {
    id: number;
    name: string;
  } | null;
  role?: {
    id: number;
    name: string;
  } | null;
}

interface PayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payroll?: Payroll; // undefined для создания, объект для редактирования
  // ✅ ДОБАВЛЯЕМ: Функции для работы с API
  onCreatePayroll?: (data: PayrollCreate) => Promise<void>;
  onUpdatePayroll?: (id: number, data: PayrollUpdate) => Promise<void>;
}

interface FormData {
  user_id: string;
  month: string;
  base_salary: string;
  bonus_amount: string;
  penalty_amount: string;
  kpi_percent: string;
  kpi_rule_id: string;
  comment: string;
}

interface FormErrors {
  user_id?: string;
  month?: string;
  base_salary?: string;
  bonus_amount?: string;
  penalty_amount?: string;
  kpi_percent?: string;
  kpi_rule_id?: string;
  comment?: string;
  general?: string;
}

const PayrollModal: React.FC<PayrollModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  payroll,
  onCreatePayroll, // ✅ ДОБАВЛЯЕМ
  onUpdatePayroll  // ✅ ДОБАВЛЯЕМ
}) => {
  const [formData, setFormData] = useState<FormData>({
    user_id: '',
    month: '',
    base_salary: '',
    bonus_amount: '',
    penalty_amount: '',
    kpi_percent: '',
    kpi_rule_id: '',
    comment: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // ✅ API хуки (оставляем как fallback если функции не переданы)
  const { data: users = [] } = useGetUsersQuery();

  // Определяем режим: создание или редактирование
  const isEditMode = !!payroll;

  // Заполнение формы при открытии
  useEffect(() => {
    if (isOpen) {
      if (payroll) {
        // Режим редактирования
        setFormData({
          user_id: payroll.user_id.toString(),
          month: payroll.month,
          base_salary: payroll.base_salary.toString(),
          bonus_amount: (payroll.bonus_amount ?? 0).toString(),
          penalty_amount: (payroll.penalty_amount ?? 0).toString(),
          kpi_percent: payroll.kpi_percent?.toString() || '',
          kpi_rule_id: payroll.kpi_rule_id?.toString() || '',
          comment: payroll.comment || ''
        });
      } else {
        // Режим создания - устанавливаем текущий месяц
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        
        setFormData({
          user_id: '',
          month: currentMonth,
          base_salary: '',
          bonus_amount: '',
          penalty_amount: '',
          kpi_percent: '100',
          kpi_rule_id: '',
          comment: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, payroll]);

  // ✅ Получение информации о пользователе
  const userInfo = useMemo(() => {
    if (!payroll) return null;
    
    // Ищем пользователя в списке
    const foundUser = users.find((user) => user.id === payroll.user_id);
    
    if (foundUser) {
      return foundUser;
    }
    
    // Если не найден в списке, но есть данные в объекте payroll
    if (payroll.user) {
      return payroll.user;
    }
    
    // Fallback
    return {
      id: payroll.user_id,
      full_name: `Пользователь ID: ${payroll.user_id}`,
      email: 'Не указан',
      position: null,
      role: null
    } as UserRead;
  }, [payroll, users]);

  // Получение имени пользователя
  const getUserDisplayName = () => {
    if (isEditMode && userInfo) {
      return userInfo.full_name || `Пользователь ID: ${payroll?.user_id}`;
    }
    
    if (!isEditMode && formData.user_id) {
      const selectedUser = users.find((user) => user.id === parseInt(formData.user_id));
      return selectedUser?.full_name || 'Выберите сотрудника';
    }
    
    return 'Новая зарплатная ведомость';
  };

  // Расчет итоговой суммы
  // Итог считается ТОЙ ЖЕ формулой, что и на сервере: оклад + премия − штраф.
  // Раньше здесь результат ещё умножался на kpi_percent / 100, из-за чего
  // предпросмотр расходился с суммой, которая реально сохраняется.
  const calculateTotal = useMemo(() => calculatePayrollTotal(formData), [formData]);

  // Форматирование суммы
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' сом';
  };

  // Форматирование месяца
  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('ru-RU', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const validateForm = (): boolean => {
    const newErrors = validatePayrollForm(formData, { isEditMode });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработка изменений полей
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очищаем ошибку поля при изменении
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // ✅ ИСПРАВЛЯЕМ: Реальная отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isEditMode && payroll) {
        // Режим редактирования
        const updateData: PayrollUpdate = {
          base_salary: parseFloat(formData.base_salary),
          bonus_amount: parseFloat(formData.bonus_amount) || 0,
          penalty_amount: parseFloat(formData.penalty_amount) || 0,
        };

        // Добавляем опциональные поля только если они заполнены
        if (formData.kpi_percent.trim()) {
          updateData.kpi_percent = parseFloat(formData.kpi_percent);
        }

        if (formData.kpi_rule_id.trim()) {
          updateData.kpi_rule_id = parseInt(formData.kpi_rule_id);
        }

        if (formData.comment.trim()) {
          updateData.comment = formData.comment.trim();
        }

        // ✅ ИСПОЛЬЗУЕМ: переданную функцию
        if (onUpdatePayroll) {
          await onUpdatePayroll(payroll.id, updateData);
        } else {
          throw new Error('onUpdatePayroll function not provided');
        }
      } else {
        // Режим создания
        const createData: PayrollCreate = {
          user_id: parseInt(formData.user_id),
          month: formData.month,
          base_salary: parseFloat(formData.base_salary),
          bonus_amount: parseFloat(formData.bonus_amount) || 0,
          penalty_amount: parseFloat(formData.penalty_amount) || 0,
        };

        // Добавляем опциональные поля только если они заполнены
        if (formData.kpi_percent.trim()) {
          createData.kpi_percent = parseFloat(formData.kpi_percent);
        }

        if (formData.kpi_rule_id.trim()) {
          createData.kpi_rule_id = parseInt(formData.kpi_rule_id);
        }

        if (formData.comment.trim()) {
          createData.comment = formData.comment.trim();
        }

        // ✅ ИСПОЛЬЗУЕМ: переданную функцию
        if (onCreatePayroll) {
          await onCreatePayroll(createData);
        } else {
          throw new Error('onCreatePayroll function not provided');
        }
      }

      onSuccess();
    } catch (rawError) {
      const error = asApiError(rawError);
      console.error('Ошибка при сохранении зарплаты:', error);
      setErrors({ 
        general: error?.message || getApiErrorMessage(error, 'Произошла ошибка')|| 
                (isEditMode ? 'Ошибка при обновлении зарплаты' : 'Ошибка при создании зарплаты') 
      });
    } finally {
      setIsLoading(false);
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {isEditMode ? 'Редактирование зарплаты' : 'Создание зарплатной ведомости'}
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

        {/* Информация о сотруднике */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {getUserDisplayName()}
            </h4>
            {isEditMode && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatMonth(payroll!.month)}
              </span>
            )}
          </div>
          
          {isEditMode && userInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">ID:</span>{' '}
                <span className="text-gray-900 dark:text-white">{payroll!.user_id}</span>
              </div>
              
              {userInfo.position?.name && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Должность:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{userInfo.position.name}</span>
                </div>
              )}
              
              {userInfo.email && userInfo.email !== 'Не указан' && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{userInfo.email}</span>
                </div>
              )}
              
              {userInfo.role?.name && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Роль:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{userInfo.role.name}</span>
                </div>
              )}
              
              {payroll!.paid_at && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Статус:</span>{' '}
                  <span className="text-green-600 dark:text-green-400 font-medium">✅ Выплачено</span>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Поля для создания новой ведомости */}
            {!isEditMode && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Выбор сотрудника */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Сотрудник *
                    </label>
                    <select
                      value={formData.user_id}
                      onChange={(e) => handleInputChange('user_id', e.target.value)}
                      className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.user_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      disabled={isLoading}
                      required
                    >
                      <option value="">Выберите сотрудника</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                    {errors.user_id && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.user_id}</p>
                    )}
                  </div>

                  {/* Выбор месяца */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Месяц *
                    </label>
                    <input
                      type="month"
                      value={formData.month}
                      onChange={(e) => handleInputChange('month', e.target.value)}
                      className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.month ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      disabled={isLoading}
                      required
                    />
                    {errors.month && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.month}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Базовая зарплата */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Базовая зарплата *
              </label>
              <input
                type="number"
                value={formData.base_salary}
                onChange={(e) => handleInputChange('base_salary', e.target.value)}
                placeholder="Введите базовую зарплату"
                min="0"
                step="0.01"
                className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.base_salary ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading || (isEditMode && !!payroll?.paid_at)}
                required
              />
              {errors.base_salary && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.base_salary}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Бонус */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Бонус
                </label>
                <input
                  type="number"
                  value={formData.bonus_amount}
                  onChange={(e) => handleInputChange('bonus_amount', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.bonus_amount ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isLoading || (isEditMode && !!payroll?.paid_at)}
                />
                {errors.bonus_amount && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bonus_amount}</p>
                )}
              </div>

              {/* Штраф */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Штраф
                </label>
                <input
                  type="number"
                  value={formData.penalty_amount}
                  onChange={(e) => handleInputChange('penalty_amount', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.penalty_amount ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isLoading || (isEditMode && !!payroll?.paid_at)}
                />
                {errors.penalty_amount && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.penalty_amount}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* KPI процент */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  KPI процент
                </label>
                <input
                  type="number"
                  value={formData.kpi_percent}
                  onChange={(e) => handleInputChange('kpi_percent', e.target.value)}
                  placeholder="100"
                  min="0"
                  max="1000"
                  step="0.1"
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.kpi_percent ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isLoading || (isEditMode && !!payroll?.paid_at)}
                />
                {errors.kpi_percent && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.kpi_percent}</p>
                )}
                {formData.kpi_percent && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    KPI: <span className={kpiColorClass(parseFloat(formData.kpi_percent))}>{formData.kpi_percent}%</span>
                  </p>
                )}
              </div>

              {/* KPI Rule ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID правила KPI
                </label>
                <input
                  type="number"
                  value={formData.kpi_rule_id}
                  onChange={(e) => handleInputChange('kpi_rule_id', e.target.value)}
                  placeholder="ID правила KPI"
                  min="1"
                  step="1"
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.kpi_rule_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isLoading || (isEditMode && !!payroll?.paid_at)}
                />
                {errors.kpi_rule_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.kpi_rule_id}</p>
                )}
              </div>
            </div>

            {/* Комментарий */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Комментарий
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => handleInputChange('comment', e.target.value)}
                placeholder="Дополнительные заметки о зарплате..."
                rows={3}
                className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.comment ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isLoading || (isEditMode && !!payroll?.paid_at)}
              />
              {errors.comment && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.comment}</p>
              )}
            </div>

            {/* Расчет итоговой суммы */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Расчет зарплаты</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Базовая зарплата:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatAmount(parseFloat(formData.base_salary) || 0)}
                  </span>
                </div>
                {parseFloat(formData.bonus_amount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-600 dark:text-green-400">+ Бонус:</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {formatAmount(parseFloat(formData.bonus_amount))}
                    </span>
                  </div>
                )}
                {parseFloat(formData.penalty_amount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400">- Штраф:</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {formatAmount(parseFloat(formData.penalty_amount))}
                    </span>
                  </div>
                )}
                <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-900 dark:text-white font-medium">Итого к выплате:</span>
                    <span className="text-gray-900 dark:text-white font-bold text-lg">
                      {formatAmount(calculateTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Уведомление о выплаченной зарплате */}
            {isEditMode && payroll?.paid_at && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <p className="font-medium">Зарплата уже выплачена</p>
                    <p>Редактирование заблокировано. Зарплата была выплачена {formatDateTime(payroll.paid_at)}.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Общие ошибки */}
            {errors.general && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{errors.general}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            {(!isEditMode || !payroll?.paid_at) && (
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                    {isEditMode ? 'Сохранение...' : 'Создание...'}
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditMode ? 'Сохранить изменения' : 'Создать ведомость'}
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className={isEditMode && payroll?.paid_at ? 'flex-1' : ''}
            >
              {isEditMode && payroll?.paid_at ? 'Закрыть' : 'Отмена'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayrollModal;
