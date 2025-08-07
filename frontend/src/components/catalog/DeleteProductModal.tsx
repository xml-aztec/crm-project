import { Product } from '../../types/catalog';

interface DeleteProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const WarningIcon = () => (
  <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

export default function DeleteProductModal({ 
  product, 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading = false 
}: DeleteProductModalProps) {
  if (!isOpen || !product) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 999999 }} // Увеличиваем z-index
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700"
        style={{ zIndex: 999999 }} // И для контента тоже
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <WarningIcon />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Удалить товар?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Вы уверены, что хотите удалить товар <span className="font-medium text-gray-900 dark:text-white">"{product.name}"</span>?
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Внимание:</strong> Это действие необратимо. Товар будет удален навсегда.
            </p>
          </div>
        </div>

        {/* Product Info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Название:</span>
              <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Цена:</span>
              <span className="font-medium text-gray-900 dark:text-white">{product.price.toLocaleString()} сом</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Статус:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                product.in_stock
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {product.in_stock ? 'В наличии' : 'Нет в наличии'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Удаление...
              </>
            ) : (
              'Удалить товар'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}