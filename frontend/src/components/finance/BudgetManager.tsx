import React, { useState, useMemo } from 'react';
import {
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  Budget,
  CreateBudgetRequest
} from '../../store/api/budgetApi';
import { useGetCashflowCategoriesQuery } from '../../store/api/cashflowApi';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';

interface BudgetManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BudgetManager: React.FC<BudgetManagerProps> = ({ isOpen, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [formData, setFormData] = useState<CreateBudgetRequest>({
    month: selectedMonth,
    category_id: 0,
    planned_amount: 0
  });
  
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Budget | null>(null);

  // API хуки
  const { data: budgets = [], isLoading: budgetsLoading } = useGetBudgetsQuery({ month: selectedMonth });
  const { data: categories = [], isLoading: categoriesLoading } = useGetCashflowCategoriesQuery();
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const [deleteBudget, { isLoading: isDeleting }] = useDeleteBudgetMutation();

  const isSubmitting = isCreating || isUpdating;

  // Категории, для которых уже есть бюджет в выбранном месяце
  const usedCategoryIds = useMemo(() => {
    return new Set(budgets.map(budget => budget.category_id));
  }, [budgets]);

  // Доступные категории для создания нового бюджета
  const availableCategories = useMemo(() => {
    return categories.filter(category => !usedCategoryIds.has(category.id));
  }, [categories, usedCategoryIds]);

  // Получить название категории
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || `Категория #${categoryId}`;
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || formData.planned_amount <= 0) return;

    try {
      if (editingBudget) {
        await updateBudget({
          id: editingBudget.id,
          data: { planned_amount: formData.planned_amount }
        }).unwrap();
      } else {
        await createBudget({
          ...formData,
          month: selectedMonth
        }).unwrap();
      }
      
      // Сброс формы
      setFormData({
        month: selectedMonth,
        category_id: 0,
        planned_amount: 0
      });
      setEditingBudget(null);
    } catch (error) {
      console.error('Ошибка при сохранении бюджета:', error);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      month: budget.month,
      category_id: budget.category_id,
      planned_amount: budget.planned_amount
    });
  };

  const handleCancelEdit = () => {
    setEditingBudget(null);
    setFormData({
      month: selectedMonth,
      category_id: 0,
      planned_amount: 0
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteBudget(deleteConfirm.id).unwrap();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Ошибка при удалении бюджета:', error);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setFormData(prev => ({ ...prev, month: newMonth }));
    setEditingBudget(null);
  };

  // Общая сумма бюджетов за месяц
  const totalBudget = useMemo(() => {
    return budgets.reduce((sum, budget) => sum + budget.planned_amount, 0);
  }, [budgets]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Управление бюджетами
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

        {/* Выбор месяца */}
        <div className="mb-6">
          <Label>Период бюджетирования</Label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              Категорий с бюджетом
            </h4>
            <p className="text-lg font-semibold text-green-900 dark:text-green-100">
              {budgets.length}
            </p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Общий бюджет
            </h4>
            <p className="text-lg font-semibold text-purple-900 dark:text-purple-100">
              {formatAmount(totalBudget)}
            </p>
          </div>
        </div>

        {/* Форма создания/редактирования бюджета */}
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {editingBudget ? 'Редактировать бюджет' : 'Создать новый бюджет'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Категория</Label>
              {editingBudget ? (
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-gray-900 dark:text-white">
                  {getCategoryName(editingBudget.category_id)}
                </div>
              ) : (
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
                  disabled={isSubmitting || categoriesLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value={0}>Выберите категорию</option>
                  {availableCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <Label>Планируемая сумма (сом)</Label>
              <Input
                type="text"
                value={formData.planned_amount || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, planned_amount: parseInt(value) || 0 }));
                }}
                placeholder="Введите сумму"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSubmitting || 
                  (!editingBudget && formData.category_id === 0) || 
                  formData.planned_amount <= 0
                }
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 border-2 border-t-brand-200 border-r-brand-200 border-b-brand-500 border-l-brand-500 rounded-full animate-spin"></span>
                    {editingBudget ? 'Обновление...' : 'Создание...'}
                  </>
                ) : (
                  editingBudget ? 'Обновить' : 'Создать'
                )}
              </Button>
              
              {editingBudget && (
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

        {/* Список бюджетов */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Бюджеты на {formatMonth(selectedMonth)} ({budgets.length})
          </h3>
          
          {budgetsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Бюджеты на этот период не найдены
            </div>
          ) : (
            <div className="space-y-2">
              {budgets.map((budget) => (
                <div
                  key={budget.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {getCategoryName(budget.category_id)}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Создано: {new Date(budget.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  
                  <div className="text-right mr-4">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatAmount(budget.planned_amount)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      disabled={isSubmitting}
                      title="Редактировать"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(budget)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      disabled={isSubmitting}
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Информационное сообщение */}
        {availableCategories.length === 0 && !categoriesLoading && categories.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Для всех доступных категорий уже созданы бюджеты на выбранный период.
            </p>
          </div>
        )}

        {/* Модальное окно подтверждения удаления */}
        <DeleteConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Удалить бюджет"
          itemName={deleteConfirm ? `${getCategoryName(deleteConfirm.category_id)} (${formatMonth(deleteConfirm.month)})` : ''}
          confirmText="Удалить"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default BudgetManager;