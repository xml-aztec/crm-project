import React, { useState } from 'react';
import { 
  useGetPaymentMethodsQuery, 
  useCreatePaymentMethodMutation, 
  useUpdatePaymentMethodMutation, 
  useDeletePaymentMethodMutation,
  PaymentMethod 
} from '../../store/api/paymentMethodsApi';
import Button from '../../components/ui/button/Button';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';

// Иконки
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const PaymentMethods: React.FC = () => {
  const { data: paymentMethods = [], isLoading } = useGetPaymentMethodsQuery();
  const [createPaymentMethod, { isLoading: isCreating }] = useCreatePaymentMethodMutation();
  const [updatePaymentMethod, { isLoading: isUpdating }] = useUpdatePaymentMethodMutation();
  const [deletePaymentMethod, { isLoading: isDeleting }] = useDeletePaymentMethodMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentMethod | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    surcharge_percent: '' as string | number, 
    max_months: null as number | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        surcharge_percent: formData.surcharge_percent === '' ? 0 : Number(formData.surcharge_percent),
        max_months: formData.max_months,
      };

      if (editingMethod) {
        await updatePaymentMethod({ id: editingMethod.id, data: submitData }).unwrap();
      } else {
        await createPaymentMethod(submitData).unwrap();
      }
      resetForm();
    } catch (error) {
      console.error('Ошибка при сохранении способа оплаты:', error);
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      surcharge_percent: method.surcharge_percent,
      max_months: method.max_months,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (method: PaymentMethod) => {
    setDeleteConfirm(method);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePaymentMethod(deleteConfirm.id).unwrap();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Ошибка при удалении способа оплаты:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', surcharge_percent: '', max_months: null }); // Убираем 0 по умолчанию
    setEditingMethod(null);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Способы оплаты
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Управление способами оплаты и их параметрами
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <PlusIcon />
          <span>Добавить способ оплаты</span>
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Способы оплаты не найдены
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Добавьте первый способ оплаты для начала работы
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Наценка
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Макс. месяцев
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paymentMethods.map((method) => (
                  <tr key={method.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        #{method.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {method.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        method.surcharge_percent > 0 
                          ? 'text-orange-600 dark:text-orange-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {method.surcharge_percent > 0 ? '+' : ''}{method.surcharge_percent}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {method.max_months ? `${method.max_months} мес.` : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        method.max_months
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {method.max_months ? 'Рассрочка' : 'Разовая оплата'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(method)}
                          disabled={isDeleting}
                          className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(method)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={resetForm}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                {editingMethod ? 'Редактировать способ оплаты' : 'Добавить способ оплаты'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Название
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Например: MPlus"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Наценка (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.surcharge_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, surcharge_percent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Дополнительная наценка за использование этого способа оплаты
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Максимум месяцев (рассрочка)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.max_months || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_months: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Оставьте пустым для разовой оплаты"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Если указано, то этот способ будет доступен для рассрочки
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating} className="flex-1">
                    {editingMethod ? 'Обновить' : 'Создать'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно удаления */}
      <DeleteConfirmModal
        title="Удалить способ оплаты?"
        itemName={deleteConfirm?.name || ''}
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default PaymentMethods;