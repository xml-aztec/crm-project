import { useParams, useNavigate } from 'react-router';
import { useMemo, useState } from 'react';
import { useGetOrderQuery, useGetOrderHistoryQuery } from '../../store/api/ordersApi';
import { useGetProductsQuery } from '../../store/api/catalogApi';
import { useGetCustomerTypesQuery } from '../../store/api/customerTypesApi';
import { useRoleAccess } from '../../hooks/useRoleAccess'; 
import Button from '../../components/ui/button/Button';
import StatusDropdown from '../../components/orders/StatusDropdown';
import ConfirmationBadge from '../../components/orders/ConfirmationBadge';
import OrderStockLogsSummary from '../../components/stock/OrderStockLogsSummary';
import OrderReturnsSummary from '../../components/orders/OrderReturnsSummary';
import ReturnModal from '../../components/orders/ReturnModal';
import TaskModal from '../../components/tasks/TaskModal';
import { formatDateTime, formatDate, formatTime } from '../../utils/dateUtils';

const Icons = {
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Status: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Mail: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Truck: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Print: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  Pencil: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Summary: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  ShoppingBag: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  CustomerType: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Error: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

const LoadingSkeleton = () => (
  <div className="max-w-7xl mx-auto p-6 space-y-6">
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
        <div className="flex space-x-3">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ErrorState = ({ id, navigate }: { id: string; navigate: (path: string) => void }) => (
  <div className="max-w-7xl mx-auto p-6">
    <div className="text-center py-16">
      <div className="mx-auto h-24 w-24 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-8">
        <Icons.Error />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Заказ не найден
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        Заказ с ID #{id} не существует, был удален или у вас нет прав доступа к нему.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={() => navigate('/orders')}>
          Вернуться к списку заказов
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Попробовать снова
        </Button>
      </div>
    </div>
  </div>
);

const InfoCard = ({ icon, title, children, className = '' }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 ${className}`}>
    <div className="flex items-center mb-4">
      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
        <div className="text-blue-600 dark:text-blue-400">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
    </div>
    {children}
  </div>
);

const InfoItem = ({ icon, label, value, className = '' }: {
  icon?: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
}) => {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === '0' ||
    value === 0 ||
    (typeof value === 'string' && (value.trim() === '' || value === '0' || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined'))
  ) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between py-2 ${className}`}>
      <div className="flex items-center">
        {icon && <div className="text-gray-400 dark:text-gray-500 mr-2">{icon}</div>}
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}:</span>
      </div>
      <div className="text-sm font-medium text-gray-900 dark:text-white text-right">{value}</div>
    </div>
  );
};

const ACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  created:       { label: 'Создан',              icon: '➕', color: 'text-blue-600 dark:text-blue-400' },
  confirmed:     { label: 'Подтверждён',         icon: '✅', color: 'text-green-600 dark:text-green-400' },
  unconfirmed:   { label: 'Подтверждение снято', icon: '🔄', color: 'text-orange-600 dark:text-orange-400' },
  status_changed:{ label: 'Статус изменён',      icon: '📋', color: 'text-purple-600 dark:text-purple-400' },
  return_requested: { label: 'Возврат оформлен (ожидает подтверждения)', icon: '↩️', color: 'text-orange-600 dark:text-orange-400' },
  return_completed: { label: 'Возврат выполнен', icon: '↩️', color: 'text-blue-600 dark:text-blue-400' },
  return_approved:  { label: 'Возврат подтверждён', icon: '↩️', color: 'text-green-600 dark:text-green-400' },
  return_rejected:  { label: 'Возврат отклонён', icon: '↩️', color: 'text-red-600 dark:text-red-400' },
};

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isProductsExpanded, setIsProductsExpanded] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const { isAdmin } = useRoleAccess();
  const orderId = parseInt(id || '0');

  const { data: order, isLoading, error, refetch } = useGetOrderQuery(orderId);
  const { data: history = [] } = useGetOrderHistoryQuery(orderId);
  const { data: products = [] } = useGetProductsQuery();
  const { data: customerTypes = [] } = useGetCustomerTypesQuery();

  const formatters = useMemo(() => ({
    price: (price: number) => new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0
    }).format(price)
  }), []);

  const getters = useMemo(() => ({
    productName: (productId: number) => {
      const product = products.find((p) => p.id === productId);
      return product?.name || `Товар #${productId}`;
    },
    
    customerTypeName: (customerTypeId: number) => {
      const customerType = customerTypes.find(type => type.id === customerTypeId);
      return customerType?.name || `Тип #${customerTypeId}`;
    },
    
    finalPrice: () => {
      if (!order) return 0;
      return parseFloat(order.finalized_total_price?.toString() || order.total_price?.toString() || '0');
    }
  }), [products, customerTypes, order]);

  const computed = useMemo(() => {
    if (!order) return { canEdit: false, orderSummary: null };

    const canEdit = isAdmin || order.status_id !== 4;
    
    const orderSummary = order.items ? {
      totalPrice: parseFloat(order.total_price?.toString() || '0'),
      itemsCount: order.items.length,
      totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      averageItemPrice: order.items.length > 0 ? parseFloat(order.total_price?.toString() || '0') / order.items.length : 0
    } : null;

    return { canEdit, orderSummary };
  }, [order, isAdmin]);

  const handlers = useMemo(() => ({
    statusUpdate: () => refetch(),
    confirmationChange: () => refetch(),
    print: () => window.print()
  }), [refetch]);

  if (isLoading) return <LoadingSkeleton />;
  if (error || !order) return <ErrorState id={id || '0'} navigate={navigate} />;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start lg:items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/orders')} className="flex items-center gap-2 px-3 py-2 shrink-0">
              <Icons.ArrowLeft />
              <span className="hidden sm:inline">Назад к заказам</span>
              <span className="sm:hidden">Назад</span>
            </Button>
            
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  Заказ #{order.id}
                  {order.status_id === 4 && <span className="ml-2 text-red-500" title="Заказ отменён">❌</span>}
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Icons.Calendar />
                <span>Создан {formatDateTime(order.created_at)}</span>
              </p>
              
              {order.cancelled_at && order.cancellation_reason && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Icons.Warning />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        Заказ отменён {formatDateTime(order.cancelled_at)}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        <strong>Причина:</strong> {order.cancellation_reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <StatusDropdown order={order} onStatusUpdate={handlers.statusUpdate} disabled={!computed.canEdit} />
              <ConfirmationBadge order={order} onConfirmationChange={handlers.confirmationChange} />
            </div>
            
            <div className="flex gap-2 pt-2 sm:pt-0 sm:pl-3 sm:border-l sm:border-gray-300 dark:sm:border-gray-600">
              <Button onClick={handlers.print} className="flex items-center gap-2">
                <Icons.Print />
                Печать
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-2"
              >
                Запланировать задачу
              </Button>
              {order.confirmed && order.status?.name !== 'Отменен' && (
                <Button
                  variant="outline"
                  onClick={() => setIsReturnModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  Оформить возврат
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <InfoCard icon={<Icons.User />} title="Информация о клиенте">
            <div className="space-y-3">
              <InfoItem label="Имя клиента" value={order.customer?.name || `Клиент #${order.customer_id}`} />
              
              {order.customer?.customer_type_id && (
                <InfoItem 
                  icon={<Icons.CustomerType />}
                  label="Тип клиента"
                  value={
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {getters.customerTypeName(order.customer.customer_type_id)}
                    </span>
                  }
                />
              )}

              {order.customer?.phone && (
                <InfoItem 
                  icon={<Icons.Phone />}
                  label="Телефон"
                  value={<a href={`tel:${order.customer.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">{order.customer.phone}</a>}
                />
              )}
              
              {order.customer?.email && (
                <InfoItem 
                  icon={<Icons.Mail />}
                  label="Email"
                  value={<a href={`mailto:${order.customer.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{order.customer.email}</a>}
                />
              )}
              
              <InfoItem label="Адрес клиента" value={order.customer?.address} />
            </div>
          </InfoCard>

          <InfoCard icon={<Icons.ShoppingBag />} title="Товары в заказе">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {computed.orderSummary?.itemsCount || 0} {(computed.orderSummary?.itemsCount || 0) === 1 ? 'товар' : 
                   (computed.orderSummary?.itemsCount || 0) < 5 ? 'товара' : 'товаров'}, 
                  общее количество: {computed.orderSummary?.totalQuantity || 0} шт.
                </div>
                <button 
                  onClick={() => setIsProductsExpanded(!isProductsExpanded)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                >
                  {isProductsExpanded ? 'Свернуть' : 'Развернуть'}
                </button>
              </div>

              {isProductsExpanded && order.items?.length ? (
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {getters.productName(item.product_id)}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              Количество: {item.quantity} шт.
                            </span>
                            <span className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              За единицу: {formatters.price(parseFloat(item.unit_price?.toString() || '0'))}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatters.price(parseFloat(item.final_price?.toString() || '0'))}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Итого</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isProductsExpanded ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Список товаров свернут
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Icons.ShoppingBag />
                  <p className="mt-2">Товары не найдены</p>
                </div>
              )}
            </div>
          </InfoCard>

          {(order.delivery_address || order.delivery_date || order.note) && (
            <InfoCard icon={<Icons.Truck />} title="Дополнительная информация">
              <div className="space-y-3">
                <InfoItem icon={<Icons.Truck />} label="Адрес доставки" value={order.delivery_address} />
                <InfoItem icon={<Icons.Calendar />} label="Дата доставки" value={order.delivery_date && formatDate(order.delivery_date)} />
                {order.note && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Примечания:</p>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {order.note}
                    </p>
                  </div>
                )}
              </div>
            </InfoCard>
          )}
        </div>

        <div className="space-y-6">
          <InfoCard icon={<Icons.Summary />} title="Сводка заказа" className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-600">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${order.status_id === 4 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {formatters.price(getters.finalPrice())}
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {order.finalized_total_price ? (
                      <div className="flex items-center justify-center gap-2">
                        <Icons.Check />
                        <span>Зафиксированная сумма</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Icons.Warning />
                        <span>Текущая сумма заказа</span>
                      </div>
                    )}
                  </div>
                  
                  {order.finalized_total_price && (
                    <div className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full mt-2 inline-block">
                      {order.status_id === 4 
                        ? '🔒 Сумма зафиксирована при отмене' 
                        : order.confirmed 
                          ? '🔒 Сумма зафиксирована при подтверждении'
                          : '🔒 Сумма зафиксирована'}
                    </div>
                  )}
                  
                  {!order.finalized_total_price && order.confirmed && (
                    <div className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full mt-2 inline-block">
                      ⚠️ Сумма может изменяться до фиксации
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <InfoItem icon={<Icons.CreditCard />} label="Способ оплаты" value={order.payment_method?.name || 'Не указан'} />
                
                {(order.payment_method?.surcharge_percent ?? 0) > 0 && (
                  <InfoItem label="Наценка" value={`+${order.payment_method!.surcharge_percent}%`} />
                )}

                {(order.installment_months ?? 0) > 0 && (
                  <InfoItem label="Рассрочка" value={`${order.installment_months!} ${order.installment_months === 1 ? 'месяц' : order.installment_months! < 5 ? 'месяца' : 'месяцев'}`} />
                )}

                <InfoItem label="Товаров" value={`${computed.orderSummary?.itemsCount || 0} позици${(computed.orderSummary?.itemsCount || 0) === 1 ? 'я' : (computed.orderSummary?.itemsCount || 0) < 5 ? 'и' : 'й'}`} />
                <InfoItem label="Общее количество" value={`${computed.orderSummary?.totalQuantity || 0} шт.`} />
              </div>
            </div>
          </InfoCard>
          
          {order.confirmed && <OrderStockLogsSummary orderId={order.id} />}
          {order.confirmed && <OrderReturnsSummary orderId={order.id} />}

          {order.user && (
            <InfoCard icon={<Icons.User />} title="Информация о заказе">
              <div className="space-y-3">
                <InfoItem 
                  icon={<Icons.User />}
                  label="Менеджер заказа"
                  value={
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.user.full_name}</span>
                      {isAdmin && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          ID: {order.user.id || 'N/A'}
                        </span>
                      )}
                    </div>
                  }
                />
                <InfoItem icon={<Icons.Calendar />} label="Дата создания" value={formatDateTime(order.created_at)} />
                {order.confirmed_at && (
                  <InfoItem icon={<Icons.Calendar />} label="Подтверждён" value={formatDateTime(order.confirmed_at)} />
                )}
                
                {isAdmin && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Служебная информация:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                        <span className="text-gray-500 dark:text-gray-400">ID заказа:</span>
                        <span className="ml-1 font-mono text-gray-900 dark:text-gray-200">{order.id}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                        <span className="text-gray-500 dark:text-gray-400">ID клиента:</span>
                        <span className="ml-1 font-mono text-gray-900 dark:text-gray-200">{order.customer_id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>
          )}

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              Временная статистика
            </h3>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Время создания:</span>
                <span>{formatTime(order.created_at)}</span>
              </div>
              {order.confirmed_at && (
                <div className="flex justify-between">
                  <span>Время подтверждения:</span>
                  <span>{formatTime(order.confirmed_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* История изменений */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">История изменений</h3>
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {history.length} событий
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Нет записей</p>
        ) : (
          <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
            {history.map((entry) => {
              const meta = ACTION_META[entry.action] ?? { label: entry.action, icon: '📌', color: 'text-gray-700 dark:text-gray-300' };
              return (
                <li key={entry.id} className="ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center text-sm rounded-full bg-white dark:bg-gray-800 ring-4 ring-white dark:ring-gray-800">
                    {meta.icon}
                  </span>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
                      {entry.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{entry.description}</p>
                      )}
                      {entry.user && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">👤 {entry.user.full_name}</p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {formatDateTime(entry.created_at)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        initialOrderId={order.id}
        initialOrderLabel={`Заказ #${order.id}`}
        initialCustomerId={order.customer_id ?? undefined}
        initialCustomerLabel={order.customer?.name}
      />

      {isReturnModalOpen && (
        <ReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          order={order}
        />
      )}
    </div>
  );
}