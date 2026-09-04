import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { 
  useDeleteProductMutation,
  Product 
} from '../../store/api/catalogApi';
import DeleteConfirmModal from '../common/DeleteConfirmModal';
import ProductQRCode from './ProductQRCode';

interface ProductsTableProps {
  products: Product[];
  isLoading?: boolean;
  brandsMap?: Record<number, string>;
  categoriesMap?: Record<number, string>;
  subcategoriesMap?: Record<number, string>;
}

const ITEMS_PER_PAGE = 10;

export default function ProductsTable({ products, isLoading = false, brandsMap = {}, categoriesMap = {}, subcategoriesMap = {} }: ProductsTableProps) {
  const navigate = useNavigate();
  const [deleteProduct] = useDeleteProductMutation();
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [qrCodeProduct, setQrCodeProduct] = useState<Product | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // ✅ ДОБАВЛЯЕМ: Состояние для пагинации
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ ДОБАВЛЯЕМ: Логика пагинации
  const { currentProducts, hasNext, hasPrevious } = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    return {
      currentProducts: products.slice(startIndex, endIndex),
      hasNext: endIndex < products.length,
      hasPrevious: currentPage > 1
    };
  }, [products, currentPage]);

  const pagination = useMemo(() => {
    return {
      currentPage,
      hasNext,
      hasPrevious,
      nextPage: () => {
        if (hasNext) {
          setCurrentPage(prev => prev + 1);
        }
      },
      prevPage: () => {
        if (hasPrevious) {
          setCurrentPage(prev => prev - 1);
        }
      },
      goToPage: (page: number) => {
        if (page >= 1) {
          setCurrentPage(page);
        }
      },
      resetToFirstPage: () => {
        setCurrentPage(1);
      }
    };
  }, [currentPage, hasNext, hasPrevious]);

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCancel = () => {
    setProductToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id).unwrap();
      setProductToDelete(null);
      setIsDeleteModalOpen(false);
      
      // ✅ ДОБАВЛЯЕМ: Обработка пагинации после удаления
      if (currentProducts.length === 1 && hasPrevious) {
        // Если это был последний элемент на странице, переходим на предыдущую
        setCurrentPage(prev => prev - 1);
      }
    } catch {
      // Обработка ошибки без логирования
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ ИЗМЕНЯЕМ: Переход на страницу редактирования
  const handleEdit = (product: Product) => {
    navigate(`/catalog/products/${product.id}/edit`);
  };

  const handleQRCodeClick = (product: Product) => {
    setQrCodeProduct(product);
    setIsQRModalOpen(true);
  };

  const handleQRModalClose = () => {
    setQrCodeProduct(null);
    setIsQRModalOpen(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-red-400 dark:bg-red-300"></span>
          Нет в наличии
        </span>
      );
    } else if (quantity <= 5) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-yellow-400 dark:bg-yellow-300"></span>
          Мало ({quantity})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-green-400 dark:bg-green-300"></span>
          В наличии ({quantity})
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 dark:bg-gray-700"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-gray-200 dark:border-gray-700">
              <div className="h-16 bg-gray-100 dark:bg-gray-800"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Товары не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Добавьте первый товар в каталог или измените параметры поиска
          </p>
        </div>
      </div>
    );
  }

  // ✅ ДОБАВЛЯЕМ: Вычисление общего количества страниц
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {/* ✅ ДОБАВЛЯЕМ: Индикатор загрузки как в OrdersTable */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-200 dark:bg-blue-800 overflow-hidden z-20">
            <div className="h-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {/* Название и основная информация */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-64">
                  Товар
                </th>

                {/* SKU */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  SKU
                </th>

                {/* Штрихкод */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Штрихкод
                </th>

                {/* Цены */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Цены
                </th>

                {/* Наличие */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Наличие
                </th>

                {/* Категория */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Категория
                </th>

                {/* Действия */}
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${isLoading ? 'opacity-70' : ''}`}>
              {/* ✅ ИЗМЕНЯЕМ: Используем currentProducts вместо products */}
              {currentProducts.map((product, index) => (
                <tr 
                  key={product.id}
                  className={`
                    transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50
                    ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}
                  `}
                >
                  {/* Название и основная информация */}
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3 max-w-xs">
                      {(() => {
                        const primaryImage =
                          product.images?.find((img) => img.is_primary) || product.images?.[0];
                        return primaryImage ? (
                          <img
                            src={primaryImage.thumbnail_url}
                            alt=""
                            loading="lazy"
                            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                            </svg>
                          </div>
                        );
                      })()}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {product.description}
                          </div>
                        )}
                        {product.brand_id && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {brandsMap[product.brand_id] ?? `Бренд #${product.brand_id}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white font-mono">
                      {product.sku || (
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          Не указан
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Штрихкод */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.barcode ? (
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {product.barcode}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic text-sm">
                        Не указан
                      </span>
                    )}
                  </td>

                  {/* Цены */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {formatPrice(product.price)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Себест.: {formatPrice(product.cost_price)}
                      </div>
                      {product.price > product.cost_price && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          +{Math.round(((product.price - product.cost_price) / product.cost_price) * 100)}%
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Наличие */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStockBadge(product.available_quantity)}
                  </td>

                  {/* Категория */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {categoriesMap[product.category_id] ?? `Категория #${product.category_id}`}
                    </div>
                    {product.subcategory_id && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {subcategoriesMap[product.subcategory_id] ?? `Подкат. #${product.subcategory_id}`}
                      </div>
                    )}
                  </td>

                  {/* Действия */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {product.qr_code && (
                        <button
                          onClick={() => handleQRCodeClick(product)}
                          title="Посмотреть QR-код"
                          className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h1m-6 0h1v1a1 1 0 01-1 1H9a1 1 0 01-1-1v-1h1m0-5V9a1 1 0 011-1h2a1 1 0 011 1v1m-4 0V8a1 1 0 011-1h2a1 1 0 011 1v1m-4 5h2m-2 0v2a1 1 0 002 0v-2" />
                          </svg>
                        </button>
                      )}

                      {/* ✅ ИЗМЕНЯЕМ: Кнопка редактирования */}
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Редактировать"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Удалить */}
                      <button
                        onClick={() => handleDeleteClick(product)}
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ ДОБАВЛЯЕМ: Пагинация как в OrdersTable */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={pagination.prevPage}
                disabled={!pagination.hasPrevious || isLoading}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Назад
              </button>
              <button
                onClick={pagination.nextPage}
                disabled={!hasNext || isLoading}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Далее
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Страница <span className="font-medium">{currentPage}</span> из <span className="font-medium">{totalPages}</span>
                  , показано <span className="font-medium">{currentProducts.length}</span> из <span className="font-medium">{products.length}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={pagination.prevPage}
                    disabled={!pagination.hasPrevious || isLoading}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Предыдущая</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
                    {currentPage}
                  </span>
                  <button
                    onClick={pagination.nextPage}
                    disabled={!hasNext || isLoading}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Следующая</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        title="Удалить товар"
        itemName={productToDelete?.name || ''}
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
      {qrCodeProduct && (
        <ProductQRCode
          productId={qrCodeProduct.id}
          productName={qrCodeProduct.name}
          isOpen={isQRModalOpen}
          onClose={handleQRModalClose}
        />
      )}
    </>
  );
}