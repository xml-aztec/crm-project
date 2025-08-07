import React, { useState } from 'react';
import { 
  useGetPositionsQuery, 
  useCreatePositionMutation, 
  useUpdatePositionMutation, 
  useDeletePositionMutation,
  Position 
} from '../../store/api/positionsApi';
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

const BriefcaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0H8m0 0H6a2 2 0 00-2 2v6a2 2 0 002 2h2m0 0h8m0 0h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2m0 0V6" />
  </svg>
);

const Positions: React.FC = () => {
  const { data: positions = [], isLoading } = useGetPositionsQuery();
  const [createPosition, { isLoading: isCreating }] = useCreatePositionMutation();
  const [updatePosition, { isLoading: isUpdating }] = useUpdatePositionMutation();
  const [deletePosition, { isLoading: isDeleting }] = useDeletePositionMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Position | null>(null);

  const [formData, setFormData] = useState({
    name: '',
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      if (editingPosition) {
        await updatePosition({ id: editingPosition.id, data: formData }).unwrap();
      } else {
        await createPosition(formData).unwrap();
      }
      resetForm();
    } catch (error) {
      console.error('Ошибка при сохранении должности:', error);
      setErrorMessage('Произошла ошибка при сохранении. Пожалуйста, попробуйте еще раз.');
    }
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({ name: position.name });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (position: Position) => {
    setDeleteConfirm(position);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePosition(deleteConfirm.id).unwrap();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Ошибка при удалении должности:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingPosition(null);
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
            Должности
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Управление должностями сотрудников компании
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <PlusIcon />
          <span>Добавить должность</span>
        </Button>
      </div>

      {positions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
            <BriefcaseIcon />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Должности не найдены
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Добавьте первую должность для начала работы с персоналом
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
                    Название должности
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {positions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        #{position.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <BriefcaseIcon />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {position.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Активна
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(position)}
                          disabled={isDeleting}
                          className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(position)}
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
                {editingPosition ? 'Редактировать должность' : 'Добавить должность'}
              </h3>
              
              {/* Отображение ошибок */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-300">{errorMessage}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Название должности
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Например: Sales-менеджер"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Укажите точное название должности для сотрудников
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating} className="flex-1">
                    {isCreating || isUpdating ? 'Сохранение...' : (editingPosition ? 'Обновить' : 'Создать')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно удаления */}
      <DeleteConfirmModal
        title="Удалить должность?"
        itemName={deleteConfirm?.name || ''}
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Positions;