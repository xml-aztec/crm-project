import React, { useState, useEffect } from 'react';
import { Warehouse } from '../../store/api/warehouseApi';
import { Branch } from '../../store/api/branchesApi';
import Button from '../ui/button/Button';

interface WarehouseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; location: string; branch_id: number }) => Promise<void>;
  warehouse?: Warehouse | null;
  branches: Branch[];
}

const WarehouseForm: React.FC<WarehouseFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  warehouse, 
  branches 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    branch_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!warehouse;

  useEffect(() => {
    if (isOpen) {
      if (warehouse) {
        setFormData({
          name: warehouse.name || '',
          location: warehouse.location || '',
          branch_id: warehouse.branch_id?.toString() || '',
        });
      } else {
        setFormData({
          name: '',
          location: '',
          branch_id: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, warehouse]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Валидация названия
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Название склада обязательно';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Название должно содержать минимум 2 символа';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Название не должно превышать 100 символов';
    }

    // Валидация локации
    if (!formData.location || !formData.location.trim()) {
      newErrors.location = 'Локация склада обязательна';
    } else if (formData.location.trim().length < 2) {
      newErrors.location = 'Локация должна содержать минимум 2 символа';
    } else if (formData.location.trim().length > 200) {
      newErrors.location = 'Локация не должна превышать 200 символов';
    }

    // Валидация филиала
    if (!formData.branch_id) {
      newErrors.branch_id = 'Выбор филиала обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value || '' }));
    
    // Убираем ошибку поля при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        name: formData.name.trim(),
        location: formData.location.trim(),
        branch_id: parseInt(formData.branch_id),
      });
    } catch (error: any) {
      console.error('Ошибка при сохранении склада:', error);
      
      // Обработка ошибок от сервера
      if (error?.status === 422 && error?.data?.detail) {
        const serverErrors: Record<string, string> = {};
        
        if (Array.isArray(error.data.detail)) {
          error.data.detail.forEach((err: any) => {
            if (err.loc && err.loc.length > 1 && err.msg) {
              const fieldName = err.loc[err.loc.length - 1];
              serverErrors[fieldName] = err.msg;
            }
          });
        }
        
        if (Object.keys(serverErrors).length > 0) {
          setErrors(serverErrors);
        } else {
          setErrors({ general: 'Ошибка валидации данных' });
        }
      } else if (error?.data?.message) {
        setErrors({ general: error.data.message });
      } else {
        setErrors({ general: `Не удалось ${isEditMode ? 'обновить' : 'создать'} склад. Попробуйте снова.` });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md z-[100000]">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Редактировать склад' : 'Создать склад'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Название склада <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.name 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  maxLength={100}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Локация */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Локация склада <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.location 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  maxLength={200}
                  required
                />
                {errors.location && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.location}</p>
                )}
              </div>

              {/* Филиал */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Филиал <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => handleInputChange('branch_id', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.branch_id 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                >
                  <option value="">Выберите филиал</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.location}
                    </option>
                  ))}
                </select>
                {errors.branch_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.branch_id}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim() || !formData.location.trim() || !formData.branch_id}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                      {isEditMode ? 'Сохранение...' : 'Создание...'}
                    </div>
                  ) : (
                    isEditMode ? 'Сохранить изменения' : 'Создать склад'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseForm;