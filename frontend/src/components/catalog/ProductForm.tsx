import { useState, useEffect, useMemo } from 'react';
import { 
  useCreateProductMutation, 
  useUpdateProductMutation, 
  useGetBrandsQuery, 
  useGetCategoriesQuery, 
  useGetSubcategoriesQuery,
  Product,
  Brand,
  Category,
  Subcategory,
  CreateProductRequest,
  UpdateProductRequest
} from '../../store/api/catalogApi';
import { isValidBarcode, BARCODE_FORMATS_HINT, BARCODE_VALIDATION_ERROR } from '../../utils/barcode';

interface ProductFormProps {
  product?: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ProductFormData {
  name: string;
  description: string;
  detail: string;
  cost_price: string;
  price: string;
  category_id: string;
  subcategory_id: string;
  brand_id: string;
  sku: string;               
  barcode: string;           
}

export default function ProductForm({ product, isOpen, onClose, onSuccess }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    detail: '',
    cost_price: '',
    price: '',
    category_id: '',
    subcategory_id: '',
    brand_id: '',
    sku: '',                 
    barcode: '',             
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  
  // Загружаем справочники
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: subcategories = [] } = useGetSubcategoriesQuery();
  const { data: categories = [] } = useGetCategoriesQuery();

  const isEditing = !!product;
  const isLoading = isCreating || isUpdating;

  // Блокируем скролл при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Очищаем при размонтировании
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        detail: product.detail || '',
        cost_price: product.cost_price?.toString() || '',
        price: product.price?.toString() || '',
        category_id: product.category_id?.toString() || '',
        subcategory_id: product.subcategory_id?.toString() || '',
        brand_id: product.brand_id?.toString() || '',
        sku: product.sku || '',              
        barcode: product.barcode || '',     
      });
    } else if (!product && isOpen) {
      // Сброс формы для создания нового товара
      setFormData({
        name: '',
        description: '',
        detail: '',
        cost_price: '',
        price: '',
        category_id: '',
        subcategory_id: '',
        brand_id: '',
        sku: '',
        barcode: '',
      });
    }
    setErrors({});
  }, [product, isOpen]);

  // Фильтруем подкатегории по выбранной категории
  const filteredSubcategories = useMemo(() => {
    if (!formData.category_id) return [];
    return subcategories.filter(
      (sub: Subcategory) => sub.category_id === Number(formData.category_id)
    );
  }, [subcategories, formData.category_id]);

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Сбрасываем подкатегорию при смене категории
      if (field === 'category_id') {
        newData.subcategory_id = '';
      }
      
      return newData;
    });

    // Очищаем ошибку поля при изменении
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите название товара';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Введите описание товара';
    }

    if (!formData.cost_price || isNaN(Number(formData.cost_price)) || Number(formData.cost_price) < 0) {
      newErrors.cost_price = 'Введите корректную себестоимость';
    }

    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Введите корректную цену товара';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Выберите категорию товара';
    }

    if (formData.barcode && formData.barcode.trim()) {
      if (!isValidBarcode(formData.barcode)) {
        newErrors.barcode = BARCODE_VALIDATION_ERROR;
      }
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
      if (isEditing && product) {
        const updateData: UpdateProductRequest = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          detail: formData.detail.trim(),
          cost_price: Number(formData.cost_price),
          price: Number(formData.price),
          brand_id: Number(formData.brand_id) || undefined,
          subcategory_id: Number(formData.subcategory_id) || undefined,
          ...(formData.sku.trim() && { sku: formData.sku.trim() }),
          ...(formData.barcode.trim() && { barcode: formData.barcode.trim() }),
        };

        await updateProduct({
          id: product.id,
          data: updateData
        }).unwrap();
      } else {
        const createData: CreateProductRequest = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          detail: formData.detail.trim(),
          cost_price: Number(formData.cost_price),
          price: Number(formData.price),
          category_id: Number(formData.category_id),
          subcategory_id: Number(formData.subcategory_id) || 0,
          brand_id: Number(formData.brand_id) || 0,
          ...(formData.sku.trim() && { sku: formData.sku.trim() }),
          ...(formData.barcode.trim() && { barcode: formData.barcode.trim() }),
        };

        await createProduct(createData).unwrap();
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
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
          // Ошибка валидации без алерта
        }
      } else {
        alert(`Ошибка при ${isEditing ? 'обновлении' : 'создании'} товара`);
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Редактировать товар' : 'Создать товар'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Название товара *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Введите название товара"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Описание *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical ${
                  errors.description ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Введите описание товара"
                disabled={isLoading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
              )}
            </div>

            {/* Detail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Детальное описание
              </label>
              <textarea
                value={formData.detail}
                onChange={(e) => handleInputChange('detail', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical"
                placeholder="Введите детальное описание товара"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SKU (артикул)
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.sku ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder={isEditing ? "Текущий SKU" : "Автоматически, если не указан"}
                  disabled={isLoading}
                />
                {errors.sku && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sku}</p>
                )}
                {!isEditing && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Оставьте пустым для автоматической генерации
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Штрихкод
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value.slice(0, 48))}
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.barcode ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Например, 4780123456782"
                  maxLength={48}
                  disabled={isLoading}
                />
                {errors.barcode && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.barcode}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {BARCODE_FORMATS_HINT}
                </p>
              </div>
            </div>

            {/* Price Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cost Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Себестоимость (сом) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.cost_price ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
                  disabled={isLoading}
                />
                {errors.cost_price && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cost_price}</p>
                )}
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Цена продажи (сом) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.price ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
                  disabled={isLoading}
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
                )}
              </div>
            </div>

            {/* Category and Subcategory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Категория {!isEditing && '*'}
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.category_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isLoading || isEditing} 
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((category: Category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category_id}</p>
                )}
                {isEditing && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Категорию нельзя изменить при редактировании
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Подкатегория
                </label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => handleInputChange('subcategory_id', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={!formData.category_id || isLoading}
                >
                  <option value="">
                    {!formData.category_id ? 'Сначала выберите категорию' : 'Выберите подкатегорию'}
                  </option>
                  {filteredSubcategories.map((subcategory: Subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Бренд
              </label>
              <select
                value={formData.brand_id}
                onChange={(e) => handleInputChange('brand_id', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={isLoading}
              >
                <option value="">Выберите бренд</option>
                {brands.map((brand: Brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isLoading}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isLoading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{isLoading ? (isEditing ? 'Обновление...' : 'Создание...') : (isEditing ? 'Обновить товар' : 'Создать товар')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}