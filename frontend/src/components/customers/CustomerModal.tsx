import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../../store/api/customersApi';
import { CustomerType } from '../../store/api/customerTypesApi';
import Button from '../ui/button/Button';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerRequest | UpdateCustomerRequest) => void;
  onScheduleTask?: () => void;
  customer?: Customer | null;
  isLoading?: boolean;
  customerTypes: CustomerType[];
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onScheduleTask,
  customer,
  isLoading = false,
  customerTypes = []
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    customer_type_id: '',
    address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        customer_type_id: customer.customer_type_id ? customer.customer_type_id.toString() : '',
        address: customer.address || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        customer_type_id: customerTypes[0]?.id ? customerTypes[0].id.toString() : '',
        address: '',
      });
    }
    setErrors({});
  }, [customer, customerTypes, isOpen]);

  // Блокируем скролл когда модальное окно открыто
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Имя обязательно';
    }

    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Телефон обязателен';
    }

    // Email теперь необязательно - только проверяем формат если заполнен
    if (formData.email && formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }

    if (!formData.customer_type_id || formData.customer_type_id === '') {
      newErrors.customer_type_id = 'Тип клиента обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = {
        ...formData,
        customer_type_id: parseInt(formData.customer_type_id),
        email: formData.email.trim() || undefined,
        address: formData.address || undefined,
      };
      onSubmit(submitData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: 999999 }} 
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 transition-opacity backdrop-blur-sm" 
        onClick={onClose}
        style={{ zIndex: 999999 }}
      ></div>

      {/* Modal - полностью поверх всего */}
      <div 
        className="flex min-h-full items-center justify-center p-4"
        style={{ zIndex: 999999 }}
      >
        <div 
          className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl transition-all transform"
          onClick={(e) => e.stopPropagation()}
          style={{ zIndex: 999999 }}
        >
          
          {/* Кнопка закрытия */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            style={{ zIndex: 1000000 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Форма */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Имя */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Имя *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                      errors.name
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Введите имя клиента"
                    autoFocus
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                </div>

                {/* Телефон */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                      errors.phone
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="0XXX XXX XXX"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                      errors.email
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="example@email.com (необязательно)"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                  )}
                </div>

                {/* Тип клиента */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип клиента *
                  </label>
                  <select
                    name="customer_type_id"
                    value={formData.customer_type_id}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                      errors.customer_type_id
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Выберите тип клиента</option>
                    {customerTypes.map((type) => (
                      <option key={type.id} value={type.id.toString()}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  {errors.customer_type_id && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customer_type_id}</p>
                  )}
                </div>
              </div>

              {/* Адрес - полная ширина */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Адрес
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Введите адрес клиента (необязательно)"
                />
              </div>

              {/* Кнопки */}
              <div className="flex items-center justify-between gap-3 pt-6">
                {customer?.id && onScheduleTask ? (
                  <Button type="button" variant="outline" onClick={onScheduleTask} disabled={isLoading}>
                    Запланировать задачу/звонок
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {customer ? 'Сохранить' : 'Создать'}
                </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  // Используем Portal для рендера вне основного DOM дерева
  return createPortal(modalContent, document.body);
};

export default CustomerModal;