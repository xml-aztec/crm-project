import React, { useState, useCallback, useEffect } from 'react';
import type { Product } from '../../store/api/catalogApi';
import { ApiValidationIssue } from '../../types/apiError';
import { asApiError } from '../../types/apiError';
import { useParams, useNavigate } from 'react-router';
import { 
  useGetSupplyByIdQuery,
  useUpdateSupplyMutation, 
  UpdateSupplyRequest,
  CreateSupplyItemRequest 
} from '../../store/api/suppliesApi';
import { useGetSuppliersQuery } from '../../store/api/suppliersApi'; 
import { useGetProductsQuery } from '../../store/api/catalogApi';
import Button from '../../components/ui/button/Button';

interface FormData {
  supplier_id: string;
  delivered_at: string;
  items: CreateSupplyItemRequest[];
}

interface FormErrors {
  supplier_id?: string;
  delivered_at?: string;
  items?: string;
  general?: string;
}

const EditSupply: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supplyId = parseInt(id || '0');
  
  // API хуки
  const { data: supply, isLoading: supplyLoading, error: supplyError } = useGetSupplyByIdQuery(supplyId, {
    skip: !supplyId
  });
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const { data: products = [] } = useGetProductsQuery();
  const [updateSupply, { isLoading }] = useUpdateSupplyMutation();
  
  // Состояние формы
  const [formData, setFormData] = useState<FormData>({
    supplier_id: '',
    delivered_at: '',
    items: []
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [productSearch, setProductSearch] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Инициализация формы данными поставки
  useEffect(() => {
    if (supply && !isInitialized) {
      const deliveredDate = new Date(supply.delivered_at);
      const formattedDate = deliveredDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
      
      setFormData({
        supplier_id: supply.supplier?.id.toString() ?? '',
        delivered_at: formattedDate,
        items: supply.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          unit_price: item.unit_price
        }))
      });
      setIsInitialized(true);
    }
  }, [supply, isInitialized]);
  
  // Фильтрация товаров для поиска
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
    (product.barcode && product.barcode.includes(productSearch))
  );
  
  // Обработчики
  const handleInputChange = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очистка ошибок при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);
  
  const addProduct = useCallback((product: Product) => {
    const existingItemIndex = formData.items.findIndex(item => item.product_id === product.id);
    
    if (existingItemIndex >= 0) {
      // Увеличиваем количество если товар уже добавлен
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += 1;
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      // Добавляем новый товар
      const newItem: CreateSupplyItemRequest = {
        product_id: product.id,
        quantity: 1,
        cost_price: product.cost_price || 0,
        unit_price: product.price || 0
      };
      setFormData(prev => ({ 
        ...prev, 
        items: [...prev.items, newItem] 
      }));
    }
    setProductSearch('');
  }, [formData.items]);
  
  const updateItem = useCallback((index: number, field: keyof CreateSupplyItemRequest, value: number) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: updatedItems }));
  }, [formData.items]);
  
  const removeItem = useCallback((index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  }, [formData.items]);
  
  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.supplier_id) {
      newErrors.supplier_id = 'Выберите поставщика';
    }
    
    if (!formData.delivered_at) {
      newErrors.delivered_at = 'Укажите дату поставки';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'Добавьте хотя бы один товар';
    }
    
    // Проверка позиций
    formData.items.forEach((item, index) => {
      if (item.quantity <= 0) {
        newErrors.items = `Позиция ${index + 1}: некорректное количество`;
      }
      if (item.cost_price < 0) {
        newErrors.items = `Позиция ${index + 1}: некорректная себестоимость`;
      }
      if (item.unit_price <= 0) {
        newErrors.items = `Позиция ${index + 1}: некорректная цена`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const updateData: UpdateSupplyRequest = {
        supplier_id: parseInt(formData.supplier_id),
        delivered_at: formData.delivered_at,
        items: formData.items
      };
      
      await updateSupply({ id: supplyId, data: updateData }).unwrap();
      navigate(`/supplies/${supplyId}`);
    } catch (rawError) {
      const error = asApiError(rawError);
      console.error('Ошибка обновления поставки:', error);
      
      if (error?.status === 422 && error?.data?.detail) {
        const serverErrors: FormErrors = {};
        
        if (Array.isArray(error?.data?.detail)) {
          (error?.data?.detail as ApiValidationIssue[]).forEach((err) => {
            if (err.loc && err.loc.length > 1 && err.msg) {
              const fieldName = err.loc[err.loc.length - 1];
              serverErrors[fieldName as keyof FormErrors] = err.msg;
            }
          });
        }
        
        setErrors({ ...serverErrors, general: 'Ошибки валидации сервера' });
      } else {
        setErrors({ general: 'Ошибка при обновлении поставки' });
      }
    }
  };
  
  // Получение информации о товаре
  const getProductInfo = (productId: number) => {
    return products.find(p => p.id === productId);
  };
  
  // Вычисление общей стоимости
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };
  
  // Loading состояние
  if (supplyLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 dark:border-blue-400 border-t-transparent"></div>
        </div>
      </div>
    );
  }
  
  // Error состояние
  if (supplyError || !supply) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Поставка не найдена
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Поставка с указанным ID не существует или была удалена
            </p>
            <Button onClick={() => navigate('/supplies')}>
              Вернуться к списку
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/supplies/${supplyId}`)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Редактировать поставку #{supply.id}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Изменение информации о поставке от {supply.supplier?.name ?? 'неизвестного поставщика'}
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Основная информация
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Поставщик */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Поставщик *
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => handleInputChange('supplier_id', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.supplier_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              >
                <option value="">Выберите поставщика</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.supplier_id}</p>
              )}
            </div>
            
            {/* Дата поставки */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата поставки *
              </label>
              <input
                type="datetime-local"
                value={formData.delivered_at}
                onChange={(e) => handleInputChange('delivered_at', e.target.value)}
                className={`block w-full md:w-1/2 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.delivered_at ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
              {errors.delivered_at && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.delivered_at}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Товары в поставке */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Товары в поставке
          </h2>
          
          {/* Поиск товаров */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Добавить товар
            </label>
            <div className="relative">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Поиск товара по названию, SKU или штрихкоду..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Результаты поиска */}
            {productSearch && filteredProducts.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                {filteredProducts.slice(0, 10).map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {product.sku && `SKU: ${product.sku} • `}
                          Цена: {product.price} сом
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Список товаров */}
          {formData.items.length > 0 ? (
            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const product = getProductInfo(item.product_id);
                return (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {product?.name || supply.items.find(si => si.product_id === item.product_id)?.product_name || `Товар #${item.product_id}`}
                        </h4>
                        {product?.sku && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Количество */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Количество
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1"
                          required
                        />
                      </div>
                      
                      {/* Себестоимость */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Себестоимость
                        </label>
                        <input
                          type="number"
                          value={item.cost_price}
                          onChange={(e) => updateItem(index, 'cost_price', parseFloat(e.target.value) || 0)}
                          className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      
                      {/* Цена продажи */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Цена продажи
                        </label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      
                      {/* Сумма */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Сумма
                        </label>
                        <div className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                          {(item.quantity * item.unit_price).toLocaleString()} сом
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Общая сумма */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-blue-900 dark:text-blue-100">
                    Общая сумма поставки:
                  </span>
                  <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {calculateTotal().toLocaleString()} сом
                  </span>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Товаров: {formData.items.length}, позиций: {formData.items.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0l-2-2m0 0l-2 2" />
              </svg>
              <p>Нет товаров в поставке</p>
              <p className="text-sm">Добавьте товары используя поиск выше</p>
            </div>
          )}
          
          {errors.items && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.items}</p>
          )}
        </div>
        
        {/* Общие ошибки */}
        {errors.general && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{errors.general}</p>
          </div>
        )}
        
        {/* Действия */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/supplies/${supplyId}`)}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={isLoading || formData.items.length === 0}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                Сохранение...
              </div>
            ) : (
              'Сохранить изменения'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditSupply;