import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  useGetBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  Branch
} from '../../store/api/branchesApi';
import BranchForm from '../../components/branches/BranchForm';
import BranchesTable from '../../components/branches/BranchesTable';
import Button from '../../components/ui/button/Button';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';

const Branches: React.FC = () => {
  const { data: branches = [], isLoading, error } = useGetBranchesQuery();
  const [createBranch] = useCreateBranchMutation();
  const [updateBranch] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();
  
  // Получаем роль пользователя для проверки прав доступа
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role?.name === 'admin' || user?.role_id === 1; // Предполагаем, что админ имеет role_id = 1

  // Состояния для модальных окон
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  // Обработчики
  const handleCreateClick = () => {
    setEditingBranch(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (branch: Branch) => {
    setEditingBranch(branch);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
  };

  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;

    try {
      await deleteBranch(branchToDelete.id).unwrap();
      setBranchToDelete(null);
    } catch {
      // Ошибка обработана в middleware
    }
  };

  const handleFormSubmit = async (data: { name: string; location: string }) => {
    // Исключение намеренно уходит наверх — форма показывает его сама.
    // Раньше здесь стоял try/catch, который просто делал throw error.
    if (editingBranch) {
      await updateBranch({ id: editingBranch.id, data }).unwrap();
    } else {
      await createBranch(data).unwrap();
    }
    setIsFormOpen(false);
    setEditingBranch(null);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBranch(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Загрузка филиалов...</span>
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
              Не удалось загрузить список филиалов
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
            Управление филиалами
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Создавайте и управляйте филиалами вашей компании
          </p>
        </div>
        
        {isAdmin && (
          <Button onClick={handleCreateClick}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить филиал
          </Button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Всего филиалов
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {branches.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица филиалов */}
      <BranchesTable
        branches={branches}
        onEdit={isAdmin ? handleEditClick : undefined}
        onDelete={isAdmin ? handleDeleteClick : undefined}
      />

      {/* Модальное окно формы */}
      <BranchForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        branch={editingBranch}
      />

      {/* Модальное окно удаления */}
      <DeleteConfirmModal
        title="Удалить филиал?"
        itemName={branchToDelete?.name || ''}
        isOpen={!!branchToDelete}
        onClose={() => setBranchToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Branches;