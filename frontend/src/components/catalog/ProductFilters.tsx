import { useState, useEffect } from 'react';
import { 
  useGetBrandsQuery, 
  useGetCategoriesQuery, 
  useGetSubcategoriesQuery, 
  type ProductFilters  
} from '../../store/api/catalogApi';

interface ProductFiltersProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ProductFilters({ filters, onFiltersChange }: ProductFiltersProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.name || '');
  const [localSKU, setLocalSKU] = useState(filters.sku || '');
  const [localBarcode, setLocalBarcode] = useState(filters.barcode || '');

  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const debouncedSKU = useDebounce(localSKU, 300);
  const debouncedBarcode = useDebounce(localBarcode, 300);

  const { data: brands = [] } = useGetBrandsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: subcategories = [] } = useGetSubcategoriesQuery();

  useEffect(() => {
    if (debouncedSearchTerm !== filters.name) {
      onFiltersChange({ ...filters, name: debouncedSearchTerm });
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (debouncedSKU !== filters.sku) {
      onFiltersChange({ ...filters, sku: debouncedSKU });
    }
  }, [debouncedSKU]);

  useEffect(() => {
    if (debouncedBarcode !== filters.barcode) {
      onFiltersChange({ ...filters, barcode: debouncedBarcode });
    }
  }, [debouncedBarcode]);

  const handleNumberChange = (field: 'category_id' | 'subcategory_id' | 'brand_id' | 'min_price' | 'max_price' | 'min_cost_price' | 'max_cost_price', value: number | undefined) => {
    if (field === 'category_id' && value !== filters.category_id) {
      onFiltersChange({ ...filters, [field]: value, subcategory_id: undefined });
    } else {
      onFiltersChange({ ...filters, [field]: value });
    }
  };

  const clearFilters = () => {
    setLocalSearchTerm('');
    setLocalSKU('');
    setLocalBarcode('');
    onFiltersChange({
      name: '',
      sku: '',
      barcode: '',
      brand_id: undefined,
      category_id: undefined,
      subcategory_id: undefined,
      min_price: undefined,
      max_price: undefined,
      min_cost_price: undefined,
      max_cost_price: undefined,
    });
  };

  const getFilteredSubcategories = () => {
    if (!filters.category_id) return [];
    return subcategories.filter(sub => sub.category_id === Number(filters.category_id));
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => 
      value !== undefined && value !== null && value !== ''
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Фильтры товаров
        </h3>
        {hasActiveFilters() && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Очистить все
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Поиск по названию
          </label>
          <div className="relative">
            <input
              type="text"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="Введите название товара..."
              className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-2.5">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU
            </label>
            <input
              type="text"
              value={localSKU}
              onChange={(e) => setLocalSKU(e.target.value)}
              placeholder="Введите SKU..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Штрихкод
            </label>
            <input
              type="text"
              value={localBarcode}
              onChange={(e) => setLocalBarcode(e.target.value)}
              placeholder="Введите штрихкод..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Существующие фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Категория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Категория
            </label>
            <select
              value={filters.category_id || ''}
              onChange={(e) => handleNumberChange('category_id', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Подкатегория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Подкатегория
            </label>
            <select
              value={filters.subcategory_id || ''}
              onChange={(e) => handleNumberChange('subcategory_id', e.target.value ? Number(e.target.value) : undefined)}
              disabled={!filters.category_id}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!filters.category_id ? 'Сначала выберите категорию' : 'Все подкатегории'}
              </option>
              {getFilteredSubcategories().map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>

          {/* Бренд */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Бренд
            </label>
            <select
              value={filters.brand_id || ''}
              onChange={(e) => handleNumberChange('brand_id', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все бренды</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {/* Цена продажи */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Цена продажи (сом)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  value={filters.min_price || ''}
                  onChange={(e) => handleNumberChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="От"
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={filters.max_price || ''}
                  onChange={(e) => handleNumberChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="До"
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Себестоимость (сом)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  value={filters.min_cost_price || ''}
                  onChange={(e) => handleNumberChange('min_cost_price', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="От"
                  min="0"
                  step="50"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={filters.max_cost_price || ''}
                  onChange={(e) => handleNumberChange('max_cost_price', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="До"
                  min="0"
                  step="50"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}