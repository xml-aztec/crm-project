import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { 
  useCreateProductMutation, 
  useGetBrandsQuery, 
  useGetCategoriesQuery, 
  useGetSubcategoriesQuery,
  CreateProductRequest, 
  Brand,
  Category,
  Subcategory 
} from '../../store/api/catalogApi';
import Button from '../../components/ui/button/Button';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import Select from '../../components/form/Select';

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

interface FormErrors {
  [key: string]: string;
}

// ✅ УБИРАЕМ: Локальный интерфейс CreateProductData больше не нужен

export default function CreateProduct() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Предзаполнение из сканера штрихкодов/QR (см. components/scanner):
  // при "товар не найден" ссылка на создание передаёт отсканированный код.
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    detail: '',
    cost_price: '',
    price: '',
    category_id: '',
    subcategory_id: '',
    brand_id: '',
    sku: searchParams.get('sku') || '',
    barcode: searchParams.get('barcode') || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  
  // ✅ API queries
  const { data: brands = [], isLoading: brandsLoading } = useGetBrandsQuery();
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useGetSubcategoriesQuery();

  // ✅ Опции для Select компонентов
  const categoryOptions = useMemo(() => 
    categories.map((category: Category) => ({
      value: category.id.toString(),
      label: category.name
    }))
  , [categories]);

  const subcategoryOptions = useMemo(() => {
    if (!formData.category_id) return [];
    return subcategories
      .filter((sub: Subcategory) => sub.category_id === Number(formData.category_id))
      .map((sub: Subcategory) => ({
        value: sub.id.toString(),
        label: sub.name
      }));
  }, [subcategories, formData.category_id]);

  const brandOptions = useMemo(() => 
    brands.map((brand: Brand) => ({
      value: brand.id.toString(),
      label: brand.name
    }))
  , [brands]);

  // ✅ Обработчики
  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Сброс подкатегории при смене категории
      if (field === 'category_id' && value !== prev.category_id) {
        newData.subcategory_id = '';
      }
      
      return newData;
    });

    // Очистка ошибки при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ограничиваем ввод только цифрами и до 13 символов
    const value = e.target.value.replace(/\D/g, '').slice(0, 13);
    handleInputChange('barcode', value);
  };

  // ✅ Валидация
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите название товара';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Введите описание товара';
    }

    if (!formData.cost_price || isNaN(Number(formData.cost_price)) || Number(formData.cost_price) < 0) {
      newErrors.cost_price = 'Введите корректную себестоимость товара';
    }

    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Введите корректную цену товара';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Выберите категорию товара';
    }

    // Проверка штрихкода
    if (formData.barcode && formData.barcode.trim()) {
      const barcode = formData.barcode.trim();
      if (!/^\d{13}$/.test(barcode)) {
        newErrors.barcode = 'Штрихкод должен содержать ровно 13 цифр (формат EAN-13)';
      }
    }

    // Проверка, что цена продажи больше себестоимости
    if (Number(formData.price) > 0 && Number(formData.cost_price) > 0) {
      if (Number(formData.price) <= Number(formData.cost_price)) {
        newErrors.price = 'Цена продажи должна быть больше себестоимости';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ ИСПРАВЛЯЕМ: Отправка формы с правильной типизацией
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // ✅ ИСПРАВЛЯЕМ: Создаем объект правильного типа CreateProductRequest
      const productData: CreateProductRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        detail: formData.detail.trim() || '', // ✅ ИСПРАВЛЯЕМ: Всегда строка, пустая если не заполнено
        cost_price: Number(formData.cost_price),
        price: Number(formData.price),
        category_id: Number(formData.category_id),
        subcategory_id: formData.subcategory_id ? Number(formData.subcategory_id) : 0, // ✅ ИСПРАВЛЯЕМ: 0 вместо undefined
        brand_id: formData.brand_id ? Number(formData.brand_id) : 0, // ✅ ИСПРАВЛЯЕМ: 0 вместо undefined
        sku: formData.sku.trim() || '', // ✅ ИСПРАВЛЯЕМ: Всегда строка
        barcode: formData.barcode.trim() || '', // ✅ ИСПРАВЛЯЕМ: Всегда строка
      };

      await createProduct(productData).unwrap();
      navigate('/catalog/products');
    } catch (error: any) {
      if (error?.status === 422 && error?.data?.detail) {
        const serverErrors: FormErrors = {};
        
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
        setErrors({ general: 'Ошибка при создании товара' });
      }
    }
  };

  // ✅ Вычисление маржи
  const calculateMargin = () => {
    const price = Number(formData.price);
    const costPrice = Number(formData.cost_price);
    if (price > 0 && costPrice > 0) {
      return Math.round(((price - costPrice) / costPrice) * 100);
    }
    return 0;
  };

  const isLoading = categoriesLoading || subcategoriesLoading || brandsLoading;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ✅ Header с навигацией */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/catalog/products')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Создать товар
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Добавьте новый товар в каталог
          </p>
        </div>
      </div>

      {/* ✅ Форма создания */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Основная информация
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Название */}
            <div className="md:col-span-2">
              <Label>Название товара *</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Введите название товара"
                className={errors.name ? 'border-red-300 dark:border-red-600' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Описание */}
            <div className="md:col-span-2">
              <Label>Описание *</Label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical ${
                  errors.description 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Введите описание товара"
                disabled={isCreating}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description}</p>
              )}
            </div>

            {/* Детальное описание */}
            <div className="md:col-span-2">
              <Label>Детальное описание</Label>
              <textarea
                value={formData.detail}
                onChange={(e) => handleInputChange('detail', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical"
                placeholder="Введите детальное описание товара (опционально)"
                disabled={isCreating}
              />
            </div>
          </div>
        </div>

        {/* Ценообразование */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Ценообразование
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Себестоимость */}
            <div>
              <Label>Себестоимость (сом) *</Label>
              <Input
                type="number"
                value={formData.cost_price}
                onChange={(e) => handleInputChange('cost_price', e.target.value)}
                placeholder="0"
                className={errors.cost_price ? 'border-red-300 dark:border-red-600' : ''}
              />
              {errors.cost_price && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cost_price}</p>
              )}
            </div>

            {/* Цена продажи */}
            <div>
              <Label>Цена продажи (сом) *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0"
                className={errors.price ? 'border-red-300 dark:border-red-600' : ''}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.price}</p>
              )}
            </div>

            {/* Маржа */}
            {Number(formData.price) > 0 && Number(formData.cost_price) > 0 && (
              <div className="md:col-span-2">
                <div className={`p-4 rounded-lg border ${
                  calculateMargin() > 0 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Маржа:
                    </span>
                    <span className={`text-lg font-bold ${
                      calculateMargin() > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {calculateMargin()}%
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Прибыль: {(Number(formData.price) - Number(formData.cost_price)).toLocaleString()} сом
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Категоризация */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Категоризация
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Категория */}
            <div>
              <Label>Категория *</Label>
              <Select
                options={categoryOptions}
                onChange={(value) => handleInputChange('category_id', value)}
                placeholder={categoriesLoading ? "Загрузка..." : "Выберите категорию"}
              />
              {errors.category_id && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.category_id}</p>
              )}
            </div>

            {/* Подкатегория */}
            <div>
              <Label>Подкатегория</Label>
              <Select
                options={subcategoryOptions}
                onChange={(value) => handleInputChange('subcategory_id', value)}
                placeholder={
                  !formData.category_id 
                    ? "Сначала выберите категорию" 
                    : subcategoriesLoading 
                      ? "Загрузка..." 
                      : "Выберите подкатегорию"
                }
              />
            </div>

            {/* Бренд */}
            <div>
              <Label>Бренд</Label>
              <Select
                options={brandOptions}
                onChange={(value) => handleInputChange('brand_id', value)}
                placeholder={brandsLoading ? "Загрузка..." : "Выберите бренд"}
              />
            </div>
          </div>
        </div>

        {/* Идентификация */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Идентификация товара
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SKU */}
            <div>
              <Label>SKU (артикул)</Label>
              <Input
                type="text"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Генерируется автоматически, если не указан"
                className={errors.sku ? 'border-red-300 dark:border-red-600' : ''}
              />
              {errors.sku && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.sku}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Автоматически генерируется, если не указан
              </p>
            </div>

            {/* Штрихкод */}
            <div>
              <Label>Штрихкод (EAN-13)</Label>
              <input
                type="text"
                value={formData.barcode}
                onChange={handleBarcodeChange}
                className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.barcode ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="1234567890123"
                disabled={isCreating}
              />
              {errors.barcode && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.barcode}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Опционально. Формат: 13 цифр
              </p>
            </div>
          </div>
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
            onClick={() => navigate('/catalog/products')}
            disabled={isCreating}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={isCreating || isLoading}
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                Создание...
              </div>
            ) : (
              'Создать товар'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}