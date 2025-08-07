import { useState } from 'react';
import { useGetSubcategoriesQuery, useGetCategoriesQuery, useDeleteSubcategoryMutation } from '../../store/api/catalogApi';
import { Subcategory } from '../../types/catalog';
import Button from '../ui/button/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import DeleteConfirmModal from '../common/DeleteConfirmModal';

interface SubcategoriesTableProps {
  onEdit?: (subcategory: Subcategory) => void;
}

const SubcategoryIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function SubcategoriesTable({ onEdit }: SubcategoriesTableProps) {
  const { data: subcategories = [], isLoading, error } = useGetSubcategoriesQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [deleteSubcategory, { isLoading: isDeleting }] = useDeleteSubcategoryMutation();
  
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<Subcategory | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || `Категория #${categoryId}`;
  };

  const handleDeleteClick = (subcategory: Subcategory) => {
    setSubcategoryToDelete(subcategory);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setSubcategoryToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (subcategoryToDelete && !isDeleting) {
      try {
        await deleteSubcategory(subcategoryToDelete.id).unwrap();
        setSubcategoryToDelete(null);
        setIsDeleteModalOpen(false);
      } catch (error) {
        // Обработка ошибки без логирования
      }
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Загрузка подкатегорий..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Ошибка загрузки
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Не удалось загрузить список подкатегорий
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  if (!subcategories.length) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-16 w-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-6">
          <SubcategoryIcon />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Подкатегории не найдены
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          Создайте подкатегории для лучшей организации товаров в каталоге
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Подкатегория
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Родительская категория
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {subcategories.map((subcategory, index) => (
                <tr 
                  key={subcategory.id} 
                  className={`transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        #{subcategory.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 flex items-center justify-center shadow-sm">
                          <SubcategoryIcon />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {subcategory.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      {getCategoryName(subcategory.category_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit?.(subcategory)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      >
                        <EditIcon />
                        <span className="hidden sm:inline">Изменить</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(subcategory)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500"
                      >
                        <TrashIcon />
                        <span className="hidden sm:inline">Удалить</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        title="Удалить подкатегорию?"
        itemName={subcategoryToDelete?.name || ''}
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
}