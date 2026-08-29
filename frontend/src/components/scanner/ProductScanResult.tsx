import { useMemo } from 'react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import Button from '../ui/button/Button';
import {
  Product,
  useGetBrandsQuery,
  useGetCategoriesQuery,
  useGetSubcategoriesQuery,
} from '../../store/api/catalogApi';

interface ProductScanResultProps {
  code: string;
  isLoading: boolean;
  product: Product | undefined;
  error: FetchBaseQueryError | SerializedError | undefined;
  onScanNext: () => void;
  onNavigateToEdit: (id: number) => void;
  onNavigateToCreate: (code: string) => void;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'KGS',
    minimumFractionDigits: 0,
  }).format(price);
}

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 whitespace-nowrap">
        Нет в наличии
      </span>
    );
  }
  if (quantity <= 5) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 whitespace-nowrap">
        Мало ({quantity})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 whitespace-nowrap">
      В наличии ({quantity})
    </span>
  );
}

function InactiveBadge() {
  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      неактивна
    </span>
  );
}

export default function ProductScanResult({
  code,
  isLoading,
  product,
  error,
  onScanNext,
  onNavigateToEdit,
  onNavigateToCreate,
}: ProductScanResultProps) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: subcategories = [] } = useGetSubcategoriesQuery();

  const category = useMemo(
    () => categories.find((c) => c.id === product?.category_id),
    [categories, product]
  );
  const subcategory = useMemo(
    () => subcategories.find((s) => s.id === product?.subcategory_id),
    [subcategories, product]
  );
  const brand = useMemo(
    () => brands.find((b) => b.id === product?.brand_id),
    [brands, product]
  );

  const notFound =
    !isLoading && !product && !!error && 'status' in error && error.status === 404;
  const isGenericError = !isLoading && !product && !!error && !notFound;

  if (isLoading || (!product && !error)) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full mb-4"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ищем товар по коду «{code}»…
        </p>
      </div>
    );
  }

  if (isGenericError) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Не удалось выполнить поиск
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Проверьте соединение и попробуйте ещё раз.
        </p>
        <Button variant="outline" onClick={onScanNext} className="w-full">
          Повторить
        </Button>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Товар не найден
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Код не соответствует ни одному товару в каталоге:
        </p>
        <p className="inline-block px-3 py-1 mb-6 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-sm text-gray-800 dark:text-gray-200">
          {code}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onScanNext} className="flex-1">
            Сканировать ещё
          </Button>
          <Button onClick={() => onNavigateToCreate(code)} className="flex-1">
            Добавить товар
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {product.description}
            </p>
          )}
        </div>
        <StockBadge quantity={product.available_quantity ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-6">
        <div>
          <span className="block text-gray-500 dark:text-gray-400">SKU</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {product.sku || '—'}
          </span>
        </div>
        <div>
          <span className="block text-gray-500 dark:text-gray-400">Штрихкод</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {product.barcode || '—'}
          </span>
        </div>
        <div>
          <span className="block text-gray-500 dark:text-gray-400">Категория</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {category?.name || '—'}
            {category && !category.is_active && <InactiveBadge />}
          </span>
        </div>
        <div>
          <span className="block text-gray-500 dark:text-gray-400">Подкатегория</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {subcategory?.name || '—'}
            {subcategory && !subcategory.is_active && <InactiveBadge />}
          </span>
        </div>
        <div>
          <span className="block text-gray-500 dark:text-gray-400">Бренд</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {brand?.name || '—'}
            {brand && !brand.is_active && <InactiveBadge />}
          </span>
        </div>
        <div>
          <span className="block text-gray-500 dark:text-gray-400">Цена</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatPrice(product.price)}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onScanNext} className="flex-1">
          Сканировать ещё
        </Button>
        <Button onClick={() => onNavigateToEdit(product.id)} className="flex-1">
          Открыть карточку
        </Button>
      </div>
    </div>
  );
}
