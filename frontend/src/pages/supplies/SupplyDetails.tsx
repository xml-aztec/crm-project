import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  useGetSupplyByIdQuery, 
  useDeleteSupplyMutation
} from '../../store/api/suppliesApi';
import Button from '../../components/ui/button/Button';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';

const SupplyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supplyId = parseInt(id || '0');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // API запросы
  const { 
    data: supply, 
    isLoading, 
    error
  } = useGetSupplyByIdQuery(supplyId, {
    skip: !supplyId
  });
  
  const [deleteSupply, { isLoading: isDeleting }] = useDeleteSupplyMutation();
  
  // Функция для скачивания PDF
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/supplies/${supplyId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `supply_${supplyId}_invoice.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Ошибка при скачивании PDF:', error);
    }
  };

  // Обработчик удаления
  const handleDelete = async () => {
    try {
      await deleteSupply(supplyId).unwrap();
      navigate('/supplies');
    } catch (error) {
      console.error('Ошибка при удалении поставки:', error);
    }
  };
  
  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Вычисление общей стоимости
  const calculateTotal = () => {
    if (!supply?.items) return 0;
    return supply.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };
  
  // Loading состояние
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 dark:border-blue-400 border-t-transparent"></div>
        </div>
      </div>
    );
  }
  
  // Error состояние
  if (error || !supply) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Поставка не найдена
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Поставка с указанным ID не существует или была удалена
            </p>
            <Button onClick={() => navigate('/supplies')}>
              Вернуться к списку
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/supplies')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Поставка #{supply.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Детальная информация о поставке
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m3 4a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Скачать PDF
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/supplies/${supply.id}/edit`)}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Редактировать
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Удалить
          </Button>
        </div>
      </div>
      
      {/* Основная информация */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Информация о поставке */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Информация о поставке
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Поставщик
                </label>
                <div className="text-gray-900 dark:text-white">
                  <p className="font-medium">{supply.supplier?.name ?? 'Поставщик удалён'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {supply.supplier?.contact_person}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {supply.supplier?.contact_info}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Склад назначения
                </label>
                <div className="text-gray-900 dark:text-white">
                  <p className="font-medium">{supply.warehouse.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {supply.warehouse.location}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Дата поставки
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {formatDate(supply.delivered_at)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Создал
                </label>
                <div className="text-gray-900 dark:text-white">
                  <p className="font-medium">{supply.created_user?.full_name ?? 'Пользователь удалён'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(supply.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Товары в поставке */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Товары в поставке ({supply.items.length} позиций)
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Товар
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Количество
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Себестоимость
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Цена продажи
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Сумма
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {supply.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.product_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {item.product_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.quantity} шт.
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.cost_price.toLocaleString()} сом
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.unit_price.toLocaleString()} сом
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                        {(item.quantity * item.unit_price).toLocaleString()} сом
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                      Общая сумма:
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-gray-900 dark:text-white">
                      {calculateTotal().toLocaleString()} сом
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Статистика */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Статистика
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Позиций товаров</span>
                <span className="font-medium text-gray-900 dark:text-white">{supply.items.length}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Общее количество</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {supply.items.reduce((sum, item) => sum + item.quantity, 0)} шт.
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Средняя себестоимость</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.round(supply.items.reduce((sum, item) => sum + item.cost_price, 0) / supply.items.length).toLocaleString()} сом
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Средняя цена продажи</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.round(supply.items.reduce((sum, item) => sum + item.unit_price, 0) / supply.items.length).toLocaleString()} сом
                </span>
              </div>
              
              <hr className="border-gray-200 dark:border-gray-600" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Общая стоимость</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {calculateTotal().toLocaleString()} сом
                </span>
              </div>
            </div>
          </div>
          
          {/* Адрес поставщика */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Адрес поставщика
            </h3>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {supply.supplier?.address || 'Адрес не указан'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Модал подтверждения удаления */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Удалить поставку"
        itemName={`#${supply.id} от ${supply.supplier?.name ?? 'неизвестного поставщика'}`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default SupplyDetails;