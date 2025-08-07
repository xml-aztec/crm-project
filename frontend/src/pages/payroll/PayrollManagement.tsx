import React, { useState, useEffect } from 'react';
import { 
  useGetPayrollsQuery,
  useCreatePayrollMutation,
  useUpdatePayrollMutation,
  useDeletePayrollMutation,
  usePayPayrollMutation,
  useRecalculatePayrollMutation
} from '../../store/api/payrollApi';
import { useGetUsersQuery } from '../../store/api/usersApi';
import { Payroll, PayrollCreate, PayrollUpdate } from '../../types/payroll';
import { User } from '../../types/user';
import PayrollTable from '../../components/payroll/PayrollTable';
import PayrollModal from '../../components/payroll/PayrollModal';
import Button from '../../components/ui/button/Button';
import { formatMonth } from '../../utils/dateUtils';

// ✅ Добавляем интерфейс уведомлений
interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const PayrollManagement: React.FC = () => {
  // Состояние
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  });

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  
  // ✅ Добавляем отсутствующие состояния
  const [notification, setNotification] = useState<Notification | null>(null);

  // API запросы
  const { data: payrolls = [], isLoading, refetch } = useGetPayrollsQuery({
    month: selectedMonth,
    user_id: selectedUserId || undefined
  });

  const { data: users = [] } = useGetUsersQuery();
  
  const [createPayroll] = useCreatePayrollMutation();
  const [updatePayroll] = useUpdatePayrollMutation();
  const [deletePayroll] = useDeletePayrollMutation();
  const [payPayroll] = usePayPayrollMutation();
  const [recalculatePayroll] = useRecalculatePayrollMutation();

  // Функции обработки
  const handleCreatePayroll = async (data: PayrollCreate) => {
    try {
      await createPayroll(data).unwrap();
      setNotification({
        type: 'success',
        message: 'Зарплатная ведомость успешно создана'
      });
      setShowModal(false);
      refetch();
    } catch (error: any) {
      console.error('Ошибка при создании зарплатной ведомости:', error);
      setNotification({
        type: 'error',
        message: error?.data?.message || 'Failed to create payroll'
      });
    }
  };

  // ✅ ИСПРАВЛЯЕМ: Правильная структура для updatePayroll
  const handleUpdatePayroll = async (id: number, data: PayrollUpdate) => {
    try {
      await updatePayroll({ 
        id, 
        data // ✅ Передаем data как отдельное свойство
      }).unwrap();
      
      setNotification({
        type: 'success',
        message: 'Зарплатная ведомость успешно обновлена'
      });
      setShowModal(false);
      setEditingPayroll(null);
      refetch();
    } catch (error: any) {
      console.error('Ошибка при обновлении зарплатной ведомости:', error);
      setNotification({
        type: 'error',
        message: error?.data?.message || 'Failed to update payroll'
      });
    }
  };

  const handlePayPayroll = async (payroll: Payroll, comment?: string) => {
    try {
      // ✅ Исправляем структуру запроса
      await payPayroll({
        id: payroll.id,
        comment: comment || undefined
      }).unwrap();
      
      setNotification({
        type: 'success',
        message: 'Зарплата успешно выплачена'
      });
      
      refetch();
    } catch (error: any) {
      console.error('Ошибка при выплате зарплаты:', error);
      setNotification({
        type: 'error',
        message: error?.data?.message || 'Failed to pay payroll'
      });
    }
  };

  const handleRecalculatePayroll = async (payroll: Payroll) => {
    try {
      await recalculatePayroll(payroll.id).unwrap();
      setNotification({
        type: 'success',
        message: 'Зарплатная ведомость успешно пересчитана'
      });
      refetch();
    } catch (error: any) {
      console.error('Ошибка при пересчете зарплатной ведомости:', error);
      setNotification({
        type: 'error',
        message: error?.data?.message || 'Failed to recalculate payroll'
      });
    }
  };

  const handleDeletePayroll = (payroll: Payroll) => {
    if (window.confirm('Вы уверены, что хотите удалить эту зарплатную ведомость?')) {
      deletePayroll(payroll.id)
        .unwrap()
        .then(() => {
          setNotification({
            type: 'success',
            message: 'Зарплатная ведомость успешно удалена'
          });
          refetch();
        })
        .catch((error: any) => {
          console.error('Ошибка при удалении зарплатной ведомости:', error);
          setNotification({
            type: 'error',
            message: error?.data?.message || 'Failed to delete payroll'
          });
        });
    }
  };

  const handleEditPayroll = (payroll: Payroll) => {
    setEditingPayroll(payroll);
    setShowModal(true);
  };

  // Автоматическое скрытие уведомлений
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' сом';
  };

  // Статистика по зарплатам
  const totalAmount = payrolls.reduce((acc, payroll) => acc + payroll.total_paid, 0);
  const paidAmount = payrolls
    .filter(payroll => payroll.paid_at)
    .reduce((acc, payroll) => acc + payroll.total_paid, 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Управление зарплатами
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Создание и управление зарплатными ведомостями
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Создать ведомость
        </Button>
      </div>

      {/* Уведомления */}
      {notification && (
        <div className={`rounded-lg p-4 ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
            : notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
              : notification.type === 'warning'
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
                : 'bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notification.type === 'success' && (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Месяц
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сотрудник
            </label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Все сотрудники</option>
              {/* ✅ Типизируем параметр user */}
              {users.map((user: User) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="w-full"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Обновить
            </Button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Общая сумма за {formatMonth(selectedMonth)}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatAmount(totalAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Выплачено
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatAmount(paidAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                К выплате
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatAmount(unpaidAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Исправляем: убираем лишние props из PayrollTable */}
      <PayrollTable
        payrolls={payrolls}
        isLoading={isLoading}
        onEdit={handleEditPayroll}
        onPay={handlePayPayroll}
        onRecalculate={handleRecalculatePayroll}
        onDelete={handleDeletePayroll}
      />

      {/* ✅ ИСПРАВЛЯЕМ: PayrollModal с правильными props */}
      {showModal && (
        <PayrollModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingPayroll(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingPayroll(null);
            refetch();
            setNotification({
              type: 'success',
              message: editingPayroll ? 'Зарплата успешно обновлена' : 'Зарплата успешно создана'
            });
          }}
          payroll={editingPayroll || undefined}
          // ✅ ПЕРЕДАЕМ: функции для работы с API
          onCreatePayroll={handleCreatePayroll}
          onUpdatePayroll={handleUpdatePayroll}
        />
      )}
    </div>
  );
};

export default PayrollManagement;