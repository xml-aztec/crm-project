import { 
  useGetProductsQuery,
  useGetBrandsQuery,
  Product
} from '../../store/api/catalogApi';
import { useGetOrderQuery } from '../../store/api/ordersApi';

interface OrderDetailsProps {
  orderId: number;
  onClose: () => void;
}

export default function OrderDetails({ orderId, onClose }: OrderDetailsProps) {
  // API hooks
  const { data: products = [] } = useGetProductsQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { 
    data: orderDetails, 
    isLoading, 
    error 
  } = useGetOrderQuery(orderId);

  // Helper functions
  const getBrandName = (brandId: number) => {
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || 'Неизвестный бренд';
  };

  const getProductInfo = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product || null;
  };

  // Функция для отображения статуса
  const getStatusDisplay = (status: { name?: string } | string | null | undefined) => {
    if (typeof status === 'object' && status?.name) {
      return status.name;
    }
    return status?.toString() || 'Неизвестно';
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <p className="text-center text-red-600 dark:text-red-400">
            Ошибка загрузки данных заказа
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Детали заказа #{orderId}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Информация о заказе
              </h3>
              <div className="space-y-2">
                <p><strong>ID:</strong> {orderDetails.id}</p>
                <p><strong>Статус:</strong> {getStatusDisplay(orderDetails.status)}</p> {/* Исправлено */}
                <p><strong>Дата создания:</strong> {new Date(orderDetails.created_at).toLocaleDateString()}</p>
                <p><strong>Общая сумма:</strong> {orderDetails.total_amount?.toLocaleString()} сом</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Клиент
              </h3>
              <div className="space-y-2">
                <p><strong>Имя:</strong> {orderDetails.customer?.name}</p> {/* Исправлено: full_name -> name */}
                <p><strong>Телефон:</strong> {orderDetails.customer?.phone}</p>
                <p><strong>Email:</strong> {orderDetails.customer?.email}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Товары в заказе
            </h3>
            <div className="space-y-3">
              {orderDetails.items?.map((item) => {
                const product = getProductInfo(item.product_id);
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {product?.name || `Товар #${item.product_id}`}
                      </h4>
                      {product && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getBrandName(product.brand_id)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.quantity} шт.</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.unit_price?.toLocaleString()} сом за шт.
                      </p>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        {/* final_price — итог по строке, количество в нём уже
                            учтено. Здесь стояло item.price, которого в типе
                            OrderItem нет вовсе: под `any` это молча
                            выводило undefined и NaN. */}
                        {item.final_price?.toLocaleString()} сом
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {orderDetails.note && ( // Исправлено: notes -> note
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Примечания
              </h3>
              <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {orderDetails.note} {/* Исправлено: notes -> note */}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}