import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  useGetWarehousesQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
  Warehouse
} from '../../store/api/warehouseApi';
import { useGetBranchesQuery } from '../../store/api/branchesApi';
import WarehouseForm from '../../components/warehouse/WarehouseForm';
import WarehousesTable from '../../components/warehouse/WarehousesTable';
import Button from '../../components/ui/button/Button';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';

const Warehouses: React.FC = () => {
  const { data: warehouses = [], isLoading, error } = useGetWarehousesQuery();
  const { data: branches = [] } = useGetBranchesQuery();
  const [createWarehouse] = useCreateWarehouseMutation();
  const [updateWarehouse] = useUpdateWarehouseMutation();
  const [deleteWarehouse, { isLoading: isDeleting }] = useDeleteWarehouseMutation();
  
  // Получаем роль пользователя для проверки прав доступа
  const user = useSelector((state: RootState) => state.auth?.user);
  const isAdmin = user?.role?.name === 'admin' || user?.role_id === 1;

  // Состояния для модальных окон
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  // Обработчики
  const handleCreateClick = () => {
    setEditingWarehouse(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
  };

  const handleDeleteConfirm = async () => {
    if (!warehouseToDelete) return;
    
    try {
      await deleteWarehouse(warehouseToDelete.id).unwrap();
      setWarehouseToDelete(null);
    } catch (error) {
      // Ошибка обработана в middleware
    }
  };

  const handleFormSubmit = async (data: { name: string; location: string; branch_id: number }) => {
    try {
      if (editingWarehouse) {
        await updateWarehouse({ id: editingWarehouse.id, data }).unwrap();
      } else {
        await createWarehouse(data).unwrap();
      }
      setIsFormOpen(false);
      setEditingWarehouse(null);
    } catch (error) {
      throw error; // Пробрасываем ошибку для отображения в форме
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingWarehouse(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Загрузка складов...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Не удалось загрузить список складов
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Обновить страницу
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Управление складами
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управляйте складскими помещениями и их привязкой к филиалам
          </p>
        </div>
        
        {isAdmin && (
          <Button onClick={handleCreateClick}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить склад
          </Button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Всего складов
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {warehouses.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Активные филиалы
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {branches.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица складов */}
      <WarehousesTable
        warehouses={warehouses}
        branches={branches}
        onEdit={isAdmin ? handleEditClick : undefined}
        onDelete={isAdmin ? handleDeleteClick : undefined}
      />

      {/* Модальное окно формы */}
      <WarehouseForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        warehouse={editingWarehouse}
        branches={branches}
      />

      {/* Модальное окно удаления */}
      <DeleteConfirmModal
        title="Удалить склад?"
        itemName={warehouseToDelete?.name || ''}
        isOpen={!!warehouseToDelete}
        onClose={() => setWarehouseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Warehouses;