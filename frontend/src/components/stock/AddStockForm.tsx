import React, { useState, useMemo } from 'react';
import { useCreateStockMutation } from '../../store/api/stockApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import Button from '../ui/button/Button';

interface AddStockFormProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedWarehouseId?: number;
  preselectedProductId?: number;
}

const AddStockForm: React.FC<AddStockFormProps> = ({
  isOpen,
  onClose,
  preselectedWarehouseId,
  preselectedProductId
}) => {
  const [formData, setFormData] = useState({
    product_id: preselectedProductId?.toString() || '',
    warehouse_id: preselectedWarehouseId?.toString() || '',
    quantity: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productSearch, setProductSearch] = useState('');

  const [createStock, { isLoading }] = useCreateStockMutation();
  const { data: products = [] } = useGetProductsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();

  // Фильтрация товаров по поиску
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 50); // Показываем первые 50
    
    return products.filter(product =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
      (product.barcode && product.barcode.includes(productSearch))
    ).slice(0, 20); // Ограничиваем результаты поиска
  }, [products, productSearch]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_id) {
      newErrors.product_id = 'Выберите товар';
    }

    if (!formData.warehouse_id) {
      newErrors.warehouse_id = 'Выберите склад';
    }

    if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      newErrors.quantity = 'Введите корректное количество';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await createStock({
        product_id: parseInt(formData.product_id),
        warehouse_id: parseInt(formData.warehouse_id),
        quantity: parseInt(formData.quantity)
      }).unwrap();

      setFormData({
        product_id: preselectedProductId?.toString() || '',
        warehouse_id: preselectedWarehouseId?.toString() || '',
        quantity: ''
      });
      setProductSearch('');
      setErrors({});
      onClose();
    } catch (error: any) {
      console.error('Ошибка создания остатка:', error);
      
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
        
        setErrors(serverErrors);
      } else {
        setErrors({ general: 'Ошибка при добавлении остатка' });
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getProductInfo = (productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return null;
    
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {product.sku && <span>SKU: {product.sku}</span>}
        {product.price && <span className="ml-2">Цена: {product.price} сом</span>}
      </div>
    );
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
                Добавить остаток товара
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
              {/* Поиск и выбор товара */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Товар <span className="text-red-500">*</span>
                </label>
                
                {/* Поле поиска */}
                <div className="relative mb-2">
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

                {/* Выбор товара */}
                <select
                  value={formData.product_id}
                  onChange={(e) => handleInputChange('product_id', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.product_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                >
                  <option value="">Выберите товар</option>
                  {filteredProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku && `(${product.sku})`}
                    </option>
                  ))}
                </select>
                
                {formData.product_id && getProductInfo(formData.product_id)}
                
                {errors.product_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.product_id}</p>
                )}
              </div>

              {/* Склад */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Склад <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => handleInputChange('warehouse_id', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.warehouse_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                >
                  <option value="">Выберите склад</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.location}
                    </option>
                  ))}
                </select>
                {errors.warehouse_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.warehouse_id}</p>
                )}
              </div>

              {/* Количество */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Количество <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.quantity ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0"
                  min="0"
                  required
                />
                {errors.quantity && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.quantity}</p>
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
                  disabled={isLoading || !formData.product_id || !formData.warehouse_id || !formData.quantity}
                  className="flex-1"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                      Добавление...
                    </div>
                  ) : (
                    'Добавить остаток'
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

export default AddStockForm;