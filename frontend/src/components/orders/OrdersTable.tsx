import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useDateFormatters } from '../../hooks/useDateFormatters'; // Добавляем импорт
import { 
  useGetOrdersQuery, 
  useDeleteOrderMutation,
  OrderFilters,
  Order,
  PaginatedOrdersResponse 
} from '../../store/api/ordersApi';
import { useGetPaymentMethodsQuery } from '../../store/api/paymentMethodsApi';
import { useGetCustomerTypesQuery } from '../../store/api/customerTypesApi'; 
import Button from '../ui/button/Button';
import DeleteConfirmModal from '../common/DeleteConfirmModal';
import OrderActionsMenu from './OrderActionsMenu';
import StatusDropdown from './StatusDropdown';
import ConfirmationBadge from './ConfirmationBadge';
import { useRoleAccess } from '../../hooks/useRoleAccess';

interface OrdersTableProps {
  filters: OrderFilters;
  onEdit?: (order: Order) => void;
  onViewDetails: (order: Order) => void;
}

const ITEMS_PER_PAGE = 10;

export default function OrdersTable({ filters, onEdit, onViewDetails }: OrdersTableProps) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'created_at' | 'total_price' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ ИСПРАВЛЯЕМ: Вызываем useRoleAccess на верхнем уровне
  const { isAdmin } = useRoleAccess();
  
  const queryParams = useMemo(() => ({
    ...filters,
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE + 1,
    ...(sortBy && { sort_by: sortBy, sort_order: sortOrder })
  }), [filters, currentPage, sortBy, sortOrder]);

  const { 
    data: apiResponse, 
    isLoading,
    error,
    refetch 
  } = useGetOrdersQuery(queryParams);

  const { currentOrders, hasNext } = useMemo(() => {
    if (!apiResponse) return { currentOrders: [], hasNext: false };

    let orders: Order[] = [];
    
    if (Array.isArray(apiResponse)) {
      orders = apiResponse;
    } else {
      const response = apiResponse as PaginatedOrdersResponse;
      orders = response.items || [];
    }

    const hasMorePages = orders.length > ITEMS_PER_PAGE;
    const displayOrders = hasMorePages ? orders.slice(0, ITEMS_PER_PAGE) : orders;
    
    return {
      currentOrders: displayOrders,
      hasNext: hasMorePages
    };
  }, [apiResponse, currentPage]);

  const pagination = useMemo(() => {
    const hasPrevious = currentPage > 1;
    
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
  }, [currentPage, hasNext]);

  const { data: paymentMethods = [] } = useGetPaymentMethodsQuery();
  const { data: customerTypes = [] } = useGetCustomerTypesQuery();
  const [deleteOrder, { isLoading: isDeleting }] = useDeleteOrderMutation();

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status_id, filters.customer_name, filters.date_from, filters.date_to]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const handleSort = useCallback((field: 'created_at' | 'total_price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

  const SortIcon = useCallback(({ field }: { field: 'created_at' | 'total_price' }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  }, [sortBy, sortOrder]);

  const handleDeleteClick = useCallback((order: Order) => {
    setOrderToDelete(order);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    if (!isDeleting) {
      setOrderToDelete(null);
      setIsDeleteModalOpen(false);
    }
  }, [isDeleting]);

  const handleDeleteOrder = useCallback(async () => {
    if (!orderToDelete || isDeleting) return;

    try {
      await deleteOrder(orderToDelete.id).unwrap();
      setOrderToDelete(null);
      
      // Обновляем данные после удаления
      if (currentOrders.length === 1 && pagination.currentPage > 1) {
        // Если это был последний элемент на странице, переходим на предыдущую
        navigate(`?page=${pagination.currentPage - 1}`, { replace: true });
      } else {
        refetch();
      }
    } catch (error) {
      // Ошибка обработана в middleware
    }
  }, [orderToDelete, isDeleting, deleteOrder, currentOrders.length, pagination, refetch]);

  const handleConfirmOrder = useCallback(async () => {
    // Просто обновляем данные без логирования
    refetch();
  }, [refetch]);

  const handlePrintOrder = useCallback(() => {
    window.print();
  }, []);

  const handleExportOrder = useCallback(() => {
    // Экспорт заказа
  }, []);

  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0
    }).format(price);
  }, []);

  const getPaymentMethodName = useCallback((order: Order) => {
    if (order.payment_method?.name) {
      return order.payment_method.name;
    }
    
    if (order.payment_method_id) {
      const paymentMethod = paymentMethods.find(method => method.id === order.payment_method_id);
      return paymentMethod?.name || `Способ #${order.payment_method_id}`;
    }
    
    return 'Не указан';
  }, [paymentMethods]);

  const getCustomerTypeName = useCallback((customerTypeId?: number) => {
    if (!customerTypeId) return null;
    const customerType = customerTypes.find(type => type.id === customerTypeId);
    return customerType?.name;
  }, [customerTypes]);

  const getFinalPrice = useCallback((order: Order) => {
    const finalPrice = order.finalized_total_price ?? order.total_price;
    return parseFloat(finalPrice?.toString() || '0');
  }, []);

  const { dateTime, date: formatDateOnly } = useDateFormatters();

  const getCancellationInfo = useCallback((order: Order) => {
    if (!order.cancelled_at || !order.cancellation_reason) return null;
    
    return {
      date: formatDateOnly(order.cancelled_at),
      reason: order.cancellation_reason
    };
  }, [formatDateOnly]);

  const canEditOrder = useCallback((order: Order, userIsAdmin: boolean) => {
    if (userIsAdmin) return true;
    if (order.status_id === 4) return false;
    
    return true;
  }, []);

  const handleRowClick = useCallback((order: Order, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('select')) {
      return;
    }
    
    navigate(`/orders/${order.id}`);
  }, [navigate]);

  const handleStatusUpdate = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleConfirmationChange = useCallback(() => {
    refetch();
  }, [refetch]);

  // Заменяем локальную функцию formatDate на централизованную
  const formatOrderDate = useCallback((dateString: string) => {
    try {
      return dateTime(dateString);
    } catch (error) {
      console.error('Ошибка форматирования даты заказа:', error);
      return 'Ошибка даты';
    }
  }, [dateTime]);

  if (isLoading && !currentOrders.length) {
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

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center py-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ошибка загрузки
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Не удалось загрузить список заказов. Проверьте подключение к серверу.
          </p>
          <Button onClick={() => window.location.reload()}>
            Обновить страницу
          </Button>
        </div>
      </div>
    );
  }

  if (!currentOrders.length && !isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center py-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Заказы не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-4">
            {Object.values(filters).some(value => value !== '') 
              ? 'Попробуйте изменить фильтры поиска' 
              : 'Заказы отсутствуют. Создайте первый заказ!'}
          </p>
          <Button onClick={() => navigate('/orders/create')}>
            Создать заказ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-200 dark:bg-blue-800 overflow-hidden z-20">
            <div className="h-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
          </div>
        )}

        {/* Mobile card view */}
        <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {currentOrders.map((order: Order) => {
            const canEdit = canEditOrder(order, isAdmin);
            return (
              <div
                key={order.id}
                onClick={() => onViewDetails(order)}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${order.status_id === 4 ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${order.status_id === 4 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                        #{order.id}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {order.customer?.name || `Клиент #${order.customer_id}`}
                      </span>
                    </div>
                    {order.customer?.phone && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{order.customer.phone}</p>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                    {formatPrice(getFinalPrice(order))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown order={order} onStatusUpdate={handleStatusUpdate} disabled={!canEdit} />
                  <ConfirmationBadge order={order} onConfirmationChange={handleConfirmationChange} size="sm" showDetails={false} />
                  <OrderActionsMenu
                    order={order}
                    onEdit={canEdit && onEdit ? onEdit : undefined}
                    onViewDetails={onViewDetails}
                    onConfirm={handleConfirmOrder}
                    onDelete={handleDeleteClick}
                    onPrint={handlePrintOrder}
                    onExport={handleExportOrder}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatOrderDate(order.created_at)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{getPaymentMethodName(order)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table view */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Клиент
                </th>
                
                {/* ✅ ИЗМЕНЯЕМ: Колонка "Менеджер" вместо "Создатель" */}
                {isAdmin && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Менеджер
                  </th>
                )}
                
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Подтверждение
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('total_price')}
                >
                  <div className="flex items-center">
                    Сумма
                    <SortIcon field="total_price" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Оплата
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Создан
                    <SortIcon field="created_at" />
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${isLoading ? 'opacity-70' : ''}`}>
              {currentOrders.map((order: Order, index: number) => {
                const cancellationInfo = getCancellationInfo(order);
                const canEdit = canEditOrder(order, isAdmin);
                
                return (
                  <tr 
                    key={order.id} 
                    onClick={(e) => handleRowClick(order, e)}
                    className={`
                      transition-all duration-150 cursor-pointer
                      hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow-sm
                      ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}
                      ${order.status_id === 4 ? 'opacity-75' : ''}
                    `}
                  >
                    {/* ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status_id === 4 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        #{order.id}
                        {order.status_id === 4 && (
                          <span className="ml-1" title="Отменён">❌</span>
                        )}
                      </span>
                    </td>
                    
                    {/* Клиент */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.customer?.name || `Клиент #${order.customer_id}`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span>{order.customer?.phone || order.customer?.email || `ID: ${order.customer_id}`}</span>
                        {order.customer?.customer_type_id && getCustomerTypeName(order.customer.customer_type_id) && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                              {getCustomerTypeName(order.customer.customer_type_id)}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Информация об отмене */}
                      {cancellationInfo && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                          <div className="font-medium">Отменён {cancellationInfo.date}</div>
                          <div className="truncate" title={cancellationInfo.reason}>
                            Причина: {cancellationInfo.reason}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* ✅ ИЗМЕНЯЕМ: Менеджер заказа (только для админов) без ID */}
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.user?.full_name || 'Неизвестен'}
                        </div>
                      </td>
                    )}

                    {/* Статус */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusDropdown 
                        order={order} 
                        onStatusUpdate={handleStatusUpdate}
                        disabled={!canEdit}
                      />
                    </td>

                    {/* Подтверждение */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ConfirmationBadge 
                        order={order} 
                        onConfirmationChange={handleConfirmationChange}
                        size="sm"
                        showDetails={false}
                      />
                      
                      {/* ✅ ДОБАВЛЯЕМ: Дополнительные индикаторы */}
                      {order.confirmed && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Товары списаны</span>
                        </div>
                      )}
                      
                      {!order.confirmed && (!order.items?.length || !order.warehouse_id) && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Не готов</span>
                        </div>
                      )}
                    </td>

                    {/* Сумма */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPrice(getFinalPrice(order))}
                      </div>
                      
                      {/* Индикаторы фиксации суммы */}
                      {order.finalized_total_price ? (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Зафиксировано</span>
                        </div>
                      ) : order.confirmed ? (
                        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Ожидает фиксации</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Текущая
                        </div>
                      )}
                    </td>

                    {/* Оплата */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getPaymentMethodName(order)}
                      </div>
                    </td>

                    {/* Создан */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatOrderDate(order.created_at)}
                      </div>
                    </td>

                    {/* Действия */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <OrderActionsMenu
                          order={order}
                          onEdit={canEdit && onEdit ? onEdit : undefined}
                          onViewDetails={onViewDetails}
                          onConfirm={handleConfirmOrder}
                          onDelete={handleDeleteClick}
                          onPrint={handlePrintOrder}
                          onExport={handleExportOrder}
                          // ✅ ИСПРАВЛЯЕМ: Убираем или корректно используем параметр
                          // showCancellationInfo={!!cancellationInfo}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>{/* end desktop table wrapper */}

        {/* Пагинация */}
        {(pagination.hasPrevious || hasNext) && (
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
                  Страница <span className="font-medium">{currentPage}</span>, показано <span className="font-medium">{currentOrders.length}</span> записей
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

      {/* Модальное окно подтверждения удаления */}
      <DeleteConfirmModal
        title="Удалить заказ"
        itemName={orderToDelete?.id ? `#${orderToDelete.id}` : ''}
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteOrder}
        isLoading={isDeleting}
      />
    </>
  );
}
