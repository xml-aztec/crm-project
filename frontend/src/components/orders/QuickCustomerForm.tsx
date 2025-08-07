import { useState } from 'react';
import { useCreateCustomerMutation } from '../../store/api/customersApi';
import { useGetCustomerTypesQuery } from '../../store/api/customerTypesApi';
import Button from '../../components/ui/button/Button';

interface QuickCustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
}

export default function QuickCustomerForm({ isOpen, onClose, onSuccess }: QuickCustomerFormProps) {
  const [createCustomer, { isLoading }] = useCreateCustomerMutation();
  const { data: customerTypes = [] } = useGetCustomerTypesQuery();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_type_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Имя обязательно
    if (!formData.name.trim()) {
      newErrors.name = 'Имя обязательно';
    }

    // Телефон обязательно
    if (!formData.phone.trim()) {
      newErrors.phone = 'Телефон обязателен';
    } else if (formData.phone.length < 10) {
      newErrors.phone = 'Введите корректный номер телефона (минимум 10 цифр)';
    }

    // Тип клиента обязательно
    if (!formData.customer_type_id) {
      newErrors.customer_type_id = 'Тип клиента обязателен';
    }

    // Email не обязательно, но если введен - проверяем формат
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
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
      const customerData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        customer_type_id: parseInt(formData.customer_type_id),
      };

      // Добавляем email только если он заполнен
      if (formData.email.trim()) {
        customerData.email = formData.email.trim();
      }

      // Добавляем адрес только если он заполнен
      if (formData.address.trim()) {
        customerData.address = formData.address.trim();
      }

      console.log('🚀 Отправка данных клиента:', customerData);
      
      const result = await createCustomer(customerData).unwrap();
      
      console.log('✅ Клиент создан:', result);
      
      onSuccess(result);
      
      // Сброс формы
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        customer_type_id: '',
      });
      setErrors({});
      
    } catch (error: any) {
      console.error('❌ Ошибка при создании клиента:', error);
      
      // Обработка ошибок валидации от сервера
      if (error?.status === 422 && error?.data) {
        const serverErrors: Record<string, string> = {};
        
        if (error.data.detail) {
          // Если ошибка в формате массива объектов валидации
          if (Array.isArray(error.data.detail)) {
            error.data.detail.forEach((err: any) => {
              if (err.loc && err.loc.length > 1) {
                const field = err.loc[1]; // Берем имя поля
                serverErrors[field] = err.msg || 'Ошибка валидации';
              }
            });
          } else if (typeof error.data.detail === 'string') {
            serverErrors.general = error.data.detail;
          } else {
            serverErrors.general = 'Ошибка валидации данных';
          }
        } else {
          // Обработка других форматов ошибок
          if (error.data.phone) {
            serverErrors.phone = Array.isArray(error.data.phone) 
              ? error.data.phone[0] 
              : error.data.phone;
          }
          if (error.data.email) {
            serverErrors.email = Array.isArray(error.data.email) 
              ? error.data.email[0] 
              : error.data.email;
          }
          if (error.data.name) {
            serverErrors.name = Array.isArray(error.data.name) 
              ? error.data.name[0] 
              : error.data.name;
          }
          if (error.data.customer_type_id) {
            serverErrors.customer_type_id = Array.isArray(error.data.customer_type_id) 
              ? error.data.customer_type_id[0] 
              : error.data.customer_type_id;
          }
        }
        
        if (Object.keys(serverErrors).length > 0) {
          setErrors(serverErrors);
        } else {
          setErrors({ general: 'Ошибка валидации данных' });
        }
      } else if (error?.data?.message) {
        setErrors({ general: error.data.message });
      } else {
        setErrors({ general: 'Не удалось создать клиента. Попробуйте снова.' });
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Только цифры
    
    // Если начинается не с 0, добавляем 0
    if (value && !value.startsWith('0')) {
      value = '0' + value;
    }
    
    // Ограничиваем длину
    if (value.length > 12) {
      value = value.slice(0, 12);
    }
    
    setFormData(prev => ({ ...prev, phone: value }));
    
    // Убираем ошибку телефона при вводе
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Убираем ошибку поля при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
          onClick={onClose} 
        />
        
        <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl transition-all border border-gray-200 dark:border-gray-700">
          
          {/* Хедер */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Добавить клиента
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Основное содержимое */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Общая ошибка */}
            {errors.general && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-300">
                  {typeof errors.general === 'string' ? errors.general : 'Произошла ошибка'}
                </p>
              </div>
            )}

            {/* Имя - обязательно */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Имя <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  errors.name 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Введите имя клиента"
                required
                autoFocus
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {typeof errors.name === 'string' ? errors.name : 'Ошибка в поле имени'}
                </p>
              )}
            </div>

            {/* Телефон - обязательно */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Телефон <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  errors.phone 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0500******"
                required
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {typeof errors.phone === 'string' ? errors.phone : 'Ошибка в поле телефона'}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Введите номер начиная с 0 (например: 0500111111)
              </p>
            </div>

            {/* Тип клиента - обязательно */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Тип клиента <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customer_type_id}
                onChange={(e) => handleInputChange('customer_type_id', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  errors.customer_type_id 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              >
                <option value="">Выберите тип клиента</option>
                {customerTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.customer_type_id && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {typeof errors.customer_type_id === 'string' ? errors.customer_type_id : 'Ошибка в поле типа клиента'}
                </p>
              )}
            </div>

            {/* Email - необязательно */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  errors.email 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {typeof errors.email === 'string' ? errors.email : 'Ошибка в поле email'}
                </p>
              )}
            </div>

            {/* Адрес - необязательно */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Адрес
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="Адрес клиента"
              />
            </div>

            {/* Футер с кнопками */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                disabled={isLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isLoading ? 'Создание...' : 'Добавить'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}