import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useGetProductsQuery, useGetBrandsQuery, useGetCategoriesQuery, useGetSubcategoriesQuery, useImportProductsCsvMutation, ImportCsvResult } from '../../store/api/catalogApi';
import { ProductFilters } from '../../types/catalog';
import ProductsTable from '../../components/catalog/ProductsTable';
import ProductFiltersComponent from '../../components/catalog/ProductsFilters';
import Button from '../../components/ui/button/Button';

const PAGE_SIZE = 20;

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

  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportCsvResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading, error } = useGetProductsQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: subcategories = [] } = useGetSubcategoriesQuery();
  const [importCsv, { isLoading: importing }] = useImportProductsCsvMutation();

  const brandsMap = useMemo(() => Object.fromEntries(brands.map(b => [b.id, b.name])), [brands]);
  const categoriesMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c.name])), [categories]);
  const subcategoriesMap = useMemo(() => Object.fromEntries(subcategories.map(s => [s.id, s.name])), [subcategories]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/products/export-csv`, { credentials: 'include' });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const formData = new FormData();
    formData.append('file', file);
    const result = await importCsv(formData);
    if ('data' in result && result.data) {
      setImportResult(result.data);
    }
  };

  // Фильтрация товаров
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

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    setPage(1);
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

          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={exporting}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'Экспорт...' : 'Экспорт CSV'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            disabled={importing}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {importing ? 'Импорт...' : 'Импорт CSV'}
          </Button>

          <Button onClick={handleCreateProduct}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить товар
          </Button>
        </div>
      </div>

      {importResult && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          importResult.errors.length > 0
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
        }`}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Импорт завершён: создано {importResult.created}, обновлено {importResult.updated}
            </p>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {importResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">{e}</li>
                ))}
                {importResult.errors.length > 5 && (
                  <li className="text-xs text-gray-500">...ещё {importResult.errors.length - 5} ошибок</li>
                )}
              </ul>
            )}
          </div>
          <button
            onClick={() => setImportResult(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
              : `Найдено: ${filteredProducts.length} (стр. ${page} из ${totalPages})`
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

      <ProductsTable
        products={pagedProducts}
        isLoading={isLoading}
        brandsMap={brandsMap}
        categoriesMap={categoriesMap}
        subcategoriesMap={subcategoriesMap}
      />

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Показано {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredProducts.length)} из {filteredProducts.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              return start + i;
            }).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1 text-sm rounded border ${
                  n === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}