import { useState, useEffect } from 'react';
import { asApiError, getApiErrorMessage, getFieldError } from '../../types/apiError';
import { useCreateCustomerTypeMutation, useUpdateCustomerTypeMutation } from '../../store/api/customerTypesApi';
import { CustomerType } from '../../store/api/customerTypesApi';
import Button from '../ui/button/Button';

interface CustomerTypeFormProps {
  customerType?: CustomerType | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CustomerTypeForm({ customerType, isOpen, onClose, onSuccess }: CustomerTypeFormProps) {
  const [createCustomerType, { isLoading: isCreating }] = useCreateCustomerTypeMutation();
  const [updateCustomerType, { isLoading: isUpdating }] = useUpdateCustomerTypeMutation();
  
  const isLoading = isCreating || isUpdating;
  const isEditMode = !!customerType;
  
  const [formData, setFormData] = useState({
    name: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customerType) {
      setFormData({
        name: customerType.name,
      });
    } else {
      setFormData({
        name: '',
      });
    }
    setErrors({});
  }, [customerType]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название типа клиента обязательно';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Название должно содержать минимум 2 символа';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const data = {
        name: formData.name.trim(),
      };

      if (isEditMode && customerType) {
        await updateCustomerType({ id: customerType.id, data }).unwrap();
      } else {
        await createCustomerType(data).unwrap();
      }
      
      onSuccess();
    } catch (rawError) {
      const error = asApiError(rawError);
      console.error('Ошибка при сохранении типа клиента:', error);
      
      if (getFieldError(error, 'name')) {
        setErrors({ name: 'Тип клиента с таким названием уже существует' });
      } else if (getApiErrorMessage(error, 'Произошла ошибка')) {
        setErrors({ general: getApiErrorMessage(error, 'Ошибка сохранения') });
      } else {
        setErrors({ general: `Ошибка при ${isEditMode ? 'обновлении' : 'создании'} типа клиента` });
      }
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
            {isEditMode ? 'Редактировать тип клиента' : 'Новый тип клиента'}
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Общая ошибка */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          )}

          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Название типа клиента *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) {
                  setErrors({ ...errors, name: '' });
                }
              }}
              placeholder="Введите название типа клиента"
              className={`w-full px-3 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.name 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              autoFocus
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                  {isEditMode ? 'Сохранение...' : 'Создание...'}
                </div>
              ) : (
                isEditMode ? 'Сохранить изменения' : 'Создать тип клиента'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}