import React, { useState, useMemo, useCallback } from 'react';
import { 
  useGetMonthlyTargetsQuery,
  useCreateMonthlyTargetMutation,
  useUpdateMonthlyTargetMutation,
  useDeleteMonthlyTargetMutation,
  MonthlyTarget
} from '../../../store/api/monthlyTargetsApi';
import { useGetAllUsersQuery } from '../../../store/api/usersManagementApi';
import DeleteConfirmModal from '../../ui/DeleteConfirmModal';
import { useFormatting } from '../shared/hooks/useFormatting';
import { TargetFormData, FormErrors, TargetStats } from './types';
import TargetsFilters from './TargetsFilters';
import TargetsForm from './TargetsForm';
import TargetsTable from './TargetsTable';
import TargetsStatistics from './TargetsStatistics';

const TargetsManagement: React.FC = () => {
  const { formatAmount, formatMonth, getCompletionColor } = useFormatting();
  
  // Состояние для фильтров
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedManager, setSelectedManager] = useState<string>('');
  
  // Состояние для формы
  const [targetFormData, setTargetFormData] = useState<TargetFormData>({
    manager_id: '',
    month: selectedMonth,
    target_amount: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Состояние для редактирования и удаления
  const [editingTarget, setEditingTarget] = useState<MonthlyTarget | null>(null);
  const [deleteTargetConfirm, setDeleteTargetConfirm] = useState<MonthlyTarget | null>(null);

  // API запросы
  const { 
    data: targets = [], 
    isLoading: targetsLoading, 
    error: targetsError
  } = useGetMonthlyTargetsQuery({
    month: selectedMonth,
    manager_id: selectedManager ? parseInt(selectedManager) : undefined
  });

  const { data: users = [] } = useGetAllUsersQuery();
  
  // Мутации
  const [createTarget, { isLoading: isCreatingTarget }] = useCreateMonthlyTargetMutation();
  const [updateTarget, { isLoading: isUpdatingTarget }] = useUpdateMonthlyTargetMutation();
  const [deleteTarget, { isLoading: isDeletingTarget }] = useDeleteMonthlyTargetMutation();

  const isSubmittingTarget = isCreatingTarget || isUpdatingTarget;

  // Фильтруем менеджеров
  const managers = useMemo(() => {
    return users.filter(user => 
      user.position?.name?.toLowerCase().includes('менеджер') ||
      user.position?.name?.toLowerCase().includes('manager')
    );
  }, [users]);

  // ✅ ИСПРАВЛЯЕМ: Функция для получения имени менеджера
  const getManagerName = useCallback((managerId: number): string => {
    const manager = managers.find(m => m.id === managerId);
    if (manager) {
      return manager.full_name || `Пользователь #${managerId}`;
    }
    
    // Если не найден среди менеджеров, ищем среди всех пользователей
    const user = users.find(u => u.id === managerId);
    if (user) {
      return user.full_name || `Пользователь #${managerId}`;
    }
    
    return `Менеджер #${managerId}`;
  }, [managers, users]);

  // ✅ ДОБАВЛЯЕМ: Функция для получения информации о менеджере
  const getManagerInfo = useCallback((managerId: number) => {
    const manager = managers.find(m => m.id === managerId);
    if (manager) {
      return {
        name: manager.full_name || `Пользователь #${managerId}`,
        position: manager.position?.name || 'Не указано',
        initials: (manager.full_name || 'П').split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
      };
    }
    
    // Если не найден среди менеджеров, ищем среди всех пользователей
    const user = users.find(u => u.id === managerId);
    if (user) {
      return {
        name: user.full_name || `Пользователь #${managerId}`,
        position: user.position?.name || 'Не указано',
        initials: (user.full_name || 'П').split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
      };
    }
    
    return {
      name: `Менеджер #${managerId}`,
      position: 'Не указано',
      initials: 'M'
    };
  }, [managers, users]);

  // Генерируем список месяцев
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Предыдущие 6 месяцев
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long' 
      });
      months.push({ value, label });
    }
    
    // Следующие 6 месяцев
    for (let i = 1; i <= 6; i++) {
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

  // Статистика целей
  const targetStats: TargetStats = useMemo(() => {
    const totalTargets = targets.length;
    const totalTargetAmount = targets.reduce((sum, target) => sum + target.target_amount, 0);
    const totalActualAmount = targets.reduce((sum, target) => sum + (target.actual_amount || 0), 0);
    const averageCompletion = totalTargetAmount > 0 
      ? Math.round((totalActualAmount / totalTargetAmount) * 100) 
      : 0;
    
    const completedTargets = targets.filter(target => 
      (target.achievement_percentage || 0) >= 100
    ).length;
    
    const pendingTargets = totalTargets - completedTargets;

    return {
      totalTargets,
      completedTargets,
      pendingTargets,
      totalTargetAmount,
      averageCompletion
    };
  }, [targets]);

  // Валидация формы
  const validateTargetForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    if (!targetFormData.manager_id) {
      newErrors.manager_id = 'Выберите менеджера';
    }
    
    if (!targetFormData.month) {
      newErrors.month = 'Выберите месяц';
    }
    
    if (!targetFormData.target_amount) {
      newErrors.target_amount = 'Введите целевую сумму';
    } else if (parseFloat(targetFormData.target_amount) <= 0) {
      newErrors.target_amount = 'Сумма должна быть больше 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [targetFormData]);

  // Обработчик отправки формы
  const handleTargetSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTargetForm()) return;
    
    try {
      if (editingTarget) {
        await updateTarget({
          id: editingTarget.id,
          data: { target_amount: parseFloat(targetFormData.target_amount) }
        }).unwrap();
      } else {
        await createTarget({
          manager_id: parseInt(targetFormData.manager_id),
          month: targetFormData.month,
          target_amount: parseFloat(targetFormData.target_amount)
        }).unwrap();
      }
      
      // Сброс формы
      setTargetFormData({
        manager_id: '',
        month: selectedMonth,
        target_amount: ''
      });
      setEditingTarget(null);
      setErrors({});
      
    } catch (error) {
      console.error('Ошибка при сохранении цели:', error);
    }
  }, [editingTarget, targetFormData, selectedMonth, validateTargetForm, updateTarget, createTarget]);

  // Обработчики для целей
  const handleEditTarget = useCallback((target: MonthlyTarget) => {
    setEditingTarget(target);
    setTargetFormData({
      manager_id: target.manager_id.toString(),
      month: target.month.substring(0, 7), // Извлекаем YYYY-MM из YYYY-MM-01
      target_amount: target.target_amount.toString()
    });
    setErrors({});
  }, []);

  const handleCancelTargetEdit = useCallback(() => {
    setEditingTarget(null);
    setTargetFormData({
      manager_id: '',
      month: selectedMonth,
      target_amount: ''
    });
    setErrors({});
  }, [selectedMonth]);

  // Обработчик удаления
  const handleDeleteTarget = useCallback(async () => {
    if (!deleteTargetConfirm) return;
    
    try {
      await deleteTarget(deleteTargetConfirm.id).unwrap();
      setDeleteTargetConfirm(null);
    } catch (error) {
      console.error('Ошибка при удалении цели:', error);
    }
  }, [deleteTargetConfirm, deleteTarget]);

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <TargetsFilters
        selectedMonth={selectedMonth}
        selectedManager={selectedManager}
        availableMonths={availableMonths}
        managers={managers}
        onMonthChange={setSelectedMonth}
        onManagerChange={setSelectedManager}
      />

      {/* Статистика */}
      <TargetsStatistics
        stats={targetStats}
        formatAmount={formatAmount}
        getCompletionColor={getCompletionColor}
      />

      {/* Форма создания/редактирования цели */}
      <TargetsForm
        formData={targetFormData}
        errors={errors}
        editingTarget={editingTarget}
        availableMonths={availableMonths}
        managers={managers}
        isSubmitting={isSubmittingTarget}
        onFormDataChange={setTargetFormData}
        onSubmit={handleTargetSubmit}
        onCancel={handleCancelTargetEdit}
      />

      {/* Таблица целей */}
      <TargetsTable
        targets={targets}
        isLoading={targetsLoading}
        error={targetsError}
        formatAmount={formatAmount}
        formatMonth={formatMonth}
        getManagerInfo={getManagerInfo}
        getCompletionColor={getCompletionColor}
        onEdit={handleEditTarget}
        onDelete={setDeleteTargetConfirm}
        isDeletingTarget={isDeletingTarget}
      />

      {/* Модальное окно подтверждения удаления */}
      {deleteTargetConfirm && (
        <DeleteConfirmModal
          isOpen={!!deleteTargetConfirm}
          onClose={() => setDeleteTargetConfirm(null)}
          onConfirm={handleDeleteTarget}
          title="Подтвердите удаление цели"
          itemName={`цель продаж для ${getManagerName(deleteTargetConfirm.manager_id)} на сумму ${formatAmount(deleteTargetConfirm.target_amount)}`}
          confirmText="Удалить цель"
          isLoading={isDeletingTarget}
        />
      )}
    </div>
  );
};

export default TargetsManagement;