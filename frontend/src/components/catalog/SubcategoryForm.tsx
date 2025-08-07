import { useState, useEffect } from 'react';
import { useCreateSubcategoryMutation, useUpdateSubcategoryMutation, useGetCategoriesQuery } from '../../store/api/catalogApi';
import { Subcategory } from '../../types/catalog';
import Button from '../ui/button/Button';

interface SubcategoryFormProps {
  subcategory?: Subcategory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubcategoryForm({ subcategory, isOpen, onClose, onSuccess }: SubcategoryFormProps) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const [createSubcategory, { isLoading: isCreating }] = useCreateSubcategoryMutation();
  const [updateSubcategory, { isLoading: isUpdating }] = useUpdateSubcategoryMutation();
  
  const isLoading = isCreating || isUpdating;
  const isEditMode = !!subcategory;
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
  });

  useEffect(() => {
    if (subcategory) {
      setFormData({
        name: subcategory.name,
        category_id: subcategory.category_id.toString(),
      });
    } else {
      setFormData({
        name: '',
        category_id: '',
      });
    }
  }, [subcategory]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.category_id) {
      return;
    }

    try {
      const data = {
        name: formData.name.trim(),
        category_id: parseInt(formData.category_id),
      };

      if (isEditMode && subcategory) {
        await updateSubcategory({ id: subcategory.id, data }).unwrap();
      } else {
        await createSubcategory(data).unwrap();
      }
      
      onSuccess();
    } catch (error) {
      // Обработка ошибки без алерта
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditMode ? 'Редактировать подкатегорию' : 'Новая подкатегория'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Название подкатегории *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название подкатегории"
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              autoFocus
            />
          </div>

          {/* Категория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Категория *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">Выберите категорию</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formData.name.trim() || !formData.category_id}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                  {isEditMode ? 'Сохранение...' : 'Создание...'}
                </div>
              ) : (
                isEditMode ? 'Сохранить изменения' : 'Создать подкатегорию'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}