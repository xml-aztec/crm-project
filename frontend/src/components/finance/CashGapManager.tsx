import React, { useState, useMemo } from 'react';
import {
  useGetCashGapsQuery,
  useCreateCashGapMutation,
  useUpdateCashGapMutation,
  useDeleteCashGapMutation,
  CashGap,
  CreateCashGapRequest
} from '../../store/api/cashGapApi';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';

interface CashGapManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CashGapManager: React.FC<CashGapManagerProps> = ({ isOpen, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [formData, setFormData] = useState<CreateCashGapRequest>({
    month: selectedMonth,
    expected_income: 0,
    expected_expense: 0,
    comment: ''
  });
  
  const [editingGap, setEditingGap] = useState<CashGap | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CashGap | null>(null);

  // API хуки
  const { data: cashGaps = [], isLoading: gapsLoading } = useGetCashGapsQuery({ month: selectedMonth });
  const [createGap, { isLoading: isCreating }] = useCreateCashGapMutation();
  const [updateGap, { isLoading: isUpdating }] = useUpdateCashGapMutation();
  const [deleteGap, { isLoading: isDeleting }] = useDeleteCashGapMutation();

  const isSubmitting = isCreating || isUpdating;

  // Проверяем, есть ли уже прогноз на выбранный месяц
  const existingGap = useMemo(() => {
    return cashGaps.find(gap => gap.month === selectedMonth);
  }, [cashGaps, selectedMonth]);

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

  // Определение цвета gap на основе значения
  const getGapColor = (gapAmount: number) => {
    if (gapAmount < 0) {
      return 'text-red-600 dark:text-red-400'; // Отрицательный - красный
    } else if (gapAmount > 0) {
      return 'text-green-600 dark:text-green-400'; // Положительный - зеленый
    } else {
      return 'text-gray-600 dark:text-gray-400'; // Нулевой - серый
    }
  };

  // Получение иконки для gap
  const getGapIcon = (gapAmount: number) => {
    if (gapAmount < 0) {
      return '🔴'; // Красный кружок для отрицательного
    } else if (gapAmount > 0) {
      return '🟢'; // Зеленый кружок для положительного
    } else {
      return '🟡'; // Желтый кружок для нулевого
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.comment.trim() || formData.expected_income < 0 || formData.expected_expense < 0) return;

    try {
      if (editingGap) {
        await updateGap({
          id: editingGap.id,
          data: {
            expected_income: formData.expected_income,
            expected_expense: formData.expected_expense,
            comment: formData.comment.trim()
          }
        }).unwrap();
      } else {
        await createGap({
          ...formData,
          month: selectedMonth,
          comment: formData.comment.trim()
        }).unwrap();
      }
      
      // Сброс формы
      setFormData({
        month: selectedMonth,
        expected_income: 0,
        expected_expense: 0,
        comment: ''
      });
      setEditingGap(null);
    } catch (error) {
      console.error('Ошибка при сохранении прогноза:', error);
    }
  };

  const handleEdit = (gap: CashGap) => {
    setEditingGap(gap);
    setFormData({
      month: gap.month,
      expected_income: gap.expected_income,
      expected_expense: gap.expected_expense,
      comment: gap.comment
    });
  };

  const handleCancelEdit = () => {
    setEditingGap(null);
    setFormData({
      month: selectedMonth,
      expected_income: 0,
      expected_expense: 0,
      comment: ''
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteGap(deleteConfirm.id).unwrap();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Ошибка при удалении прогноза:', error);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setFormData(prev => ({ ...prev, month: newMonth }));
    setEditingGap(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Управление кассовыми разрывами
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
          <Label>Период прогнозирования</Label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Информация о существующем прогнозе */}
        {existingGap && !editingGap && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {getGapIcon(existingGap.gap_amount)} Прогноз на {formatMonth(existingGap.month)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Ожидаемый доход:</span>
                    <p className="text-green-600 dark:text-green-400 font-semibold">
                      {formatAmount(existingGap.expected_income)}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Ожидаемый расход:</span>
                    <p className="text-red-600 dark:text-red-400 font-semibold">
                      {formatAmount(existingGap.expected_expense)}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Кассовый разрыв:</span>
                    <p className={`font-bold text-lg ${getGapColor(existingGap.gap_amount)}`}>
                      {formatAmount(existingGap.gap_amount)}
                    </p>
                  </div>
                </div>
                {existingGap.comment && (
                  <div className="mt-3">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Комментарий:</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">{existingGap.comment}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(existingGap)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Редактировать"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteConfirm(existingGap)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  title="Удалить"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Форма создания/редактирования прогноза */}
        {(!existingGap || editingGap) && (
          <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingGap ? 'Редактировать прогноз' : 'Создать новый прогноз'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <Label>Ожидаемый доход (сом)</Label>
                <Input
                  type="text"
                  value={formData.expected_income || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, expected_income: parseInt(value) || 0 }));
                  }}
                  placeholder="Введите ожидаемый доход"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label>Ожидаемый расход (сом)</Label>
                <Input
                  type="text"
                  value={formData.expected_expense || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, expected_expense: parseInt(value) || 0 }));
                  }}
                  placeholder="Введите ожидаемый расход"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Предварительный расчет разрыва */}
            {(formData.expected_income > 0 || formData.expected_expense > 0) && (
              <div className="mb-4 p-3 bg-white dark:bg-gray-700 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Прогнозируемый кассовый разрыв:
                  </span>
                  <span className={`font-bold text-lg ${getGapColor(formData.expected_income - formData.expected_expense)}`}>
                    {getGapIcon(formData.expected_income - formData.expected_expense)} {formatAmount(formData.expected_income - formData.expected_expense)}
                  </span>
                </div>
                {formData.expected_income - formData.expected_expense < 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    ⚠️ Отрицательный разрыв требует контроля и планирования дополнительного финансирования
                  </p>
                )}
              </div>
            )}

            <div className="mb-4">
              <Label>Комментарий</Label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Добавьте комментарий к прогнозу (обязательно)"
                disabled={isSubmitting}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSubmitting || 
                  !formData.comment.trim() ||
                  (formData.expected_income === 0 && formData.expected_expense === 0)
                }
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 border-2 border-t-brand-200 border-r-brand-200 border-b-brand-500 border-l-brand-500 rounded-full animate-spin"></span>
                    {editingGap ? 'Обновление...' : 'Создание...'}
                  </>
                ) : (
                  editingGap ? 'Обновить прогноз' : 'Создать прогноз'
                )}
              </Button>
              
              {editingGap && (
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
          </form>
        )}

        {/* Список всех прогнозов */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            История прогнозов кассовых разрывов ({cashGaps.length})
          </h3>
          
          {gapsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
            </div>
          ) : cashGaps.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Прогнозы кассовых разрывов не найдены
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {cashGaps
                .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
                .map((gap) => (
                <div
                  key={gap.id}
                  className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {formatMonth(gap.month)}
                        </h4>
                        <span className="text-lg">
                          {getGapIcon(gap.gap_amount)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Доход:</span>
                          <p className="text-green-600 dark:text-green-400 font-medium">
                            {formatAmount(gap.expected_income)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Расход:</span>
                          <p className="text-red-600 dark:text-red-400 font-medium">
                            {formatAmount(gap.expected_expense)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Разрыв:</span>
                          <p className={`font-bold ${getGapColor(gap.gap_amount)}`}>
                            {formatAmount(gap.gap_amount)}
                          </p>
                        </div>
                      </div>
                      
                      {gap.comment && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          💬 {gap.comment}
                        </p>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        Создано: {new Date(gap.created_at || '').toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(gap)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        disabled={isSubmitting}
                        title="Редактировать"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(gap)}
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Модальное окно подтверждения удаления */}
        <DeleteConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Удалить прогноз кассового разрыва"
          itemName={deleteConfirm ? `${formatMonth(deleteConfirm.month)}` : ''}
          confirmText="Удалить"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default CashGapManager;