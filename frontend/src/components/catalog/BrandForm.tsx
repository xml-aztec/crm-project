import { useState, useEffect } from 'react';
import { useCreateBrandMutation, useUpdateBrandMutation } from '../../store/api/catalogApi';
import { Brand } from '../../types/catalog';
import Button from '../ui/button/Button';

interface BrandFormProps {
  brand?: Brand;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BrandForm({ brand, isOpen, onClose, onSuccess }: BrandFormProps) {
  const [createBrand, { isLoading: isCreating }] = useCreateBrandMutation();
  const [updateBrand, { isLoading: isUpdating }] = useUpdateBrandMutation();
  
  const isLoading = isCreating || isUpdating;
  const isEditMode = !!brand;
  
  const [formData, setFormData] = useState({
    name: '',
  });

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
      });
    } else {
      setFormData({
        name: '',
      });
    }
  }, [brand]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Пожалуйста, заполните название бренда');
      return;
    }

    try {
      const data = {
        name: formData.name.trim(),
      };

      if (isEditMode && brand) {
        await updateBrand({ id: brand.id, data }).unwrap();
      } else {
        await createBrand(data).unwrap();
      }
      
      onSuccess();
    } catch (error) {
      console.error('Ошибка при сохранении бренда:', error);
      alert(`Ошибка при ${isEditMode ? 'обновлении' : 'создании'} бренда`);
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
            {isEditMode ? 'Редактировать бренд' : 'Новый бренд'}
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
              Название бренда *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название бренда"
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              autoFocus
            />
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
              disabled={isLoading || !formData.name.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                  {isEditMode ? 'Сохранение...' : 'Создание...'}
                </div>
              ) : (
                isEditMode ? 'Сохранить изменения' : 'Создать бренд'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}