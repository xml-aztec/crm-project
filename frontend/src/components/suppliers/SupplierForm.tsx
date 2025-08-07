import React, { useState, useEffect } from 'react';
import Button from '../ui/button/Button';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../../store/api/suppliersApi';

interface SupplierFormProps {
  supplier?: Supplier;
  isLoading?: boolean;
  onSubmit: (data: CreateSupplierRequest | UpdateSupplierRequest) => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  contact_person: string;
  contact_info: string;
  address: string;
}

interface FormErrors {
  name?: string;
  contact_person?: string;
  contact_info?: string;
  address?: string;
  general?: string;
}

const SupplierForm: React.FC<SupplierFormProps> = ({
  supplier,
  isLoading = false,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    contact_person: '',
    contact_info: '',
    address: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Инициализация формы при редактировании
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person,
        contact_info: supplier.contact_info,
        address: supplier.address
      });
    }
  }, [supplier]);

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Контактное лицо обязательно';
    }

    if (!formData.contact_info.trim()) {
      newErrors.contact_info = 'Контактная информация обязательна';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Адрес обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    onSubmit(formData);
  };

  // Обработчик изменения полей
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очистка ошибок при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Название */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Название поставщика *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Введите название поставщика"
          required
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Контактное лицо */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Контактное лицо *
        </label>
        <input
          type="text"
          value={formData.contact_person}
          onChange={(e) => handleInputChange('contact_person', e.target.value)}
          className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.contact_person ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Введите ФИО контактного лица"
          required
        />
        {errors.contact_person && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.contact_person}</p>
        )}
      </div>

      {/* Контактная информация */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Контактная информация *
        </label>
        <textarea
          value={formData.contact_info}
          onChange={(e) => handleInputChange('contact_info', e.target.value)}
          rows={3}
          className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
            errors.contact_info ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Телефон, email, мессенджеры"
          required
        />
        {errors.contact_info && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.contact_info}</p>
        )}
      </div>

      {/* Адрес */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Адрес *
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          rows={3}
          className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
            errors.address ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Полный адрес поставщика"
          required
        />
        {errors.address && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.address}</p>
        )}
      </div>

      {/* Общие ошибки */}
      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{errors.general}</p>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
              {supplier ? 'Сохранение...' : 'Создание...'}
            </div>
          ) : (
            supplier ? 'Сохранить изменения' : 'Создать поставщика'
          )}
        </Button>
      </div>
    </form>
  );
};

export default SupplierForm;