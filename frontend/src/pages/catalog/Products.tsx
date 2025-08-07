import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { ProductFilters } from '../../types/catalog';
import ProductsTable from '../../components/catalog/ProductsTable';
import ProductFiltersComponent from '../../components/catalog/ProductsFilters';
import Button from '../../components/ui/button/Button';

export default function Products() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    brand_id: '',
    subcategory_id: '',
    category_id: '',
    in_stock: '',
    price_min: '',
    price_max: '',
  });

  const { data: products = [], isLoading, error } = useGetProductsQuery();

  // ✅ Фильтрация товаров
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Поиск по названию и описанию
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(searchLower);
        const matchesDescription = product.description?.toLowerCase().includes(searchLower);
        const matchesSKU = product.sku?.toLowerCase().includes(searchLower);
        const matchesBarcode = product.barcode?.includes(filters.search);
        
        if (!matchesName && !matchesDescription && !matchesSKU && !matchesBarcode) {
          return false;
        }
      }

      // Фильтр по категории
      if (filters.category_id && product.category_id.toString() !== filters.category_id) {
        return false;
      }

      // Фильтр по подкатегории
      if (filters.subcategory_id && product.subcategory_id?.toString() !== filters.subcategory_id) {
        return false;
      }

      // Фильтр по бренду
      if (filters.brand_id && product.brand_id?.toString() !== filters.brand_id) {
        return false;
      }

      // Фильтр по наличию
      if (filters.in_stock) {
        if (filters.in_stock === 'in_stock' && product.available_quantity <= 0) {
          return false;
        }
        if (filters.in_stock === 'out_of_stock' && product.available_quantity > 0) {
          return false;
        }
      }

      // Фильтр по цене
      if (filters.price_min && product.price < Number(filters.price_min)) {
        return false;
      }
      if (filters.price_max && product.price > Number(filters.price_max)) {
        return false;
      }

      return true;
    });
  }, [products, filters]);

  const handleCreateProduct = () => {
    navigate('/catalog/products/create');
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      brand_id: '',
      subcategory_id: '',
      category_id: '',
      in_stock: '',
      price_min: '',
      price_max: '',
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Не удалось загрузить список товаров
            </p>
            <Button onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Каталог товаров
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управление товарами и их характеристиками
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {Object.values(filters).some(value => value !== undefined && value !== '') && (
            <Button
              onClick={handleClearFilters}
              variant="outline"
              size="sm"
            >
              Очистить фильтры
            </Button>
          )}

          <Button onClick={handleCreateProduct}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить товар
          </Button>
        </div>
      </div>

      <ProductFiltersComponent 
        filters={filters} 
        onFiltersChange={setFilters} 
      />

      {/* Results Summary */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredProducts.length === 0 
              ? 'Товары не найдены'
              : `Найдено товаров: ${filteredProducts.length}`
            }
          </p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h1m-6 0h1v1a1 1 0 01-1 1H9a1 1 0 01-1-1v-1h1m0-5V9a1 1 0 011-1h2a1 1 0 011 1v1m-4 0V8a1 1 0 011-1h2a1 1 0 011 1v1m-4 5h2m-2 0v2a1 1 0 002 0v-2" />
              </svg>
              <span>- товары с QR-кодом</span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ УБИРАЕМ: onEdit пропс, так как теперь переход происходит внутри таблицы */}
      <ProductsTable 
        products={filteredProducts} 
        isLoading={isLoading}
      />
    </div>
  );
}