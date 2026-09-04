import { baseApi } from './baseApi';

// Типы данных
export interface User {
  id: number;
  full_name: string;
}

export interface Customer {
  name: string;
  phone: string;
  email?: string | null;
  customer_type_id: number;
  address?: string | null;
}

export interface PaymentMethod {
  id: number;
  name: string;
  surcharge_percent: number;
  max_months: number | null;
}

export interface OrderStatus {
  id: number;
  name: string;
  color: string;
}

export interface Manager {
  id: number;
  name: string;
  email: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string; 
  quantity: number;
  unit_price: number;
  final_price: number;
  total: number;
  product?: {
    id: number;
    name: string;
    price: number;
    category?: string;
    brand?: string;
  };
}

export interface Order {
  id: number;
  customer_id: number;
  warehouse_id?: number;      // ✅ ИСПРАВЛЯЕМ: Делаем опциональным
  status_id: number;
  note?: string | null;
  payment_method_id?: number | null;
  installment_months?: number | null;
  delivery_address?: string | null;
  delivery_date?: string | null;
  total_price: string | number;
  total_amount: number; // Добавить эту строку
  finalized_total_price?: string | number | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  confirmed: boolean;
  confirmed_at?: string | null;
  customer?: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    customer_type_id?: number;
    address?: string | null;
  };
  user?: {
    id: number;
    full_name: string;
  };
  payment_method?: {
    id: number;
    name: string;
    surcharge_percent: number;
    max_months: number | null;
  };
  status?: {
    id: number;
    name: string;
    color?: string;
  };
  items?: OrderItem[];
}

export interface UpdateOrderStatusRequest {
  status_id: number;
  cancellation_reason?: string;
}

export interface CreateOrderRequest {
  customer_id: number;
  warehouse_id: number;       
  status_id?: number;          
  note?: string;               
  payment_method_id?: number;   // ✅ МЕНЯЕМ: Опциональное
  installment_months?: number;  // ✅ МЕНЯЕМ: Опциональное
  delivery_address?: string;    // ✅ МЕНЯЕМ: Опциональное
  delivery_date?: string | null; // ✅ МЕНЯЕМ: Опциональное
  total_price: number;          // ✅ ОБЯЗАТЕЛЬНОЕ: Сумма с фронтенда
  items: {
    product_id: number;      
    quantity: number;         
    unit_price: number;       
    final_price: number;       
  }[];
}

export interface CreateOrderItemRequest {
  product_id: number;
  quantity: number;
  unit_price: number;
  final_price: number;
}

export interface UpdateOrderItemRequest {
  quantity?: number;
  unit_price?: number;
  final_price?: number;
}

export interface OrderFilters {
  date_from?: string;
  date_to?: string;
  status_id?: string;
  customer_name?: string;
  skip?: number;
  limit?: number;
}

export interface PaginatedOrdersResponse {
  items: Order[];
  total: number;
  skip: number;
  limit: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface MonthlyAnalyticsResponse {
  total_orders: number;
  total_income: number;
  average_order_value: number;
  unique_customers: number;
  status_counts: Array<{
    status_id: number;
    count: number;
  }>;
}

export interface ConfirmOrderRequest {
  confirmed: boolean;
}

export interface ConfirmOrderResponse extends Order {
  // Дополнительные поля при подтверждении
  confirmed: true;
  confirmed_at: string;
  finalized_total_price: number;
  stock_logs?: Array<{
    id: number;
    product_id: number;
    warehouse_id: number;
    quantity: number;
    type: 'outgoing';
    created_at: string;
  }>;
}

export interface MonthlySalesData {
  month: string;
  total: number;
}

export interface KPISummaryResponse {
  orders: {
    count: number;
    change_percent: number;
  };
  customers: {
    count: number;
    change_percent: number;
  };
}

export interface RevenueProfitData {
  month: number;
  revenue: number;
  profit: number;
}

export interface RecentOrderItem {
  id: number;
  created_at: string;
  customer_name: string;
  status: string;
  total_price: number;
  items_count: number;
}

export interface OrderStatusSummaryItem {
  status: string;
  count: number;
  percentage: number;
}

export interface OrderHistoryUser {
  id: number;
  full_name: string;
}

export interface OrderHistoryEntry {
  id: number;
  order_id: number;
  action: string;
  description: string | null;
  created_at: string;
  user: OrderHistoryUser | null;
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Заказы с пагинацией
    getOrders: builder.query<PaginatedOrdersResponse | Order[], OrderFilters>({
      query: (params = {}) => {
        // Формируем параметры запроса
        const searchParams = new URLSearchParams();
        
        // Пагинация
        if (params.skip !== undefined) {
          searchParams.append('skip', params.skip.toString());
        }
        if (params.limit !== undefined) {
          searchParams.append('limit', params.limit.toString());
        }
        
        // Фильтры
        if (params.status_id && params.status_id.trim()) {
          searchParams.append('status_id', params.status_id);
        }
        if (params.customer_name && params.customer_name.trim()) {
          searchParams.append('customer_name', params.customer_name);
        }
        if (params.date_from && params.date_from.trim()) {
          searchParams.append('date_from', params.date_from);
        }
        if (params.date_to && params.date_to.trim()) {
          searchParams.append('date_to', params.date_to);
        }

        return {
          url: 'orders/',
          params: Object.fromEntries(searchParams),
        };
      },
      providesTags: ['Order'],
      transformResponse: (response: unknown): PaginatedOrdersResponse => {
        // Бэкенд отдаёт список заказов в одной из трёх форм (голый массив,
        // DRF-подобный {results,count} или {items,total}), поэтому здесь
        // разбор с сужением типа. Раньше параметр был `any`, и любое
        // несовпадение полей проходило молча до самого рендера.
        type LooseOrdersPayload = {
          results?: Order[];
          items?: Order[];
          data?: Order[];
          count?: number;
          total?: number;
          skip?: number;
          limit?: number;
          next?: unknown;
          previous?: unknown;
          has_next?: boolean;
          has_previous?: boolean;
        };

        if (Array.isArray(response)) {
          return {
            items: response,
            total: response.length,
            skip: 0,
            limit: response.length,
            has_next: false,
            has_previous: false
          };
        }
        
        if (response && typeof response === 'object') {
          const payload = response as LooseOrdersPayload;

          if ('results' in payload) {
            const items = payload.results ?? [];
            return {
              items,
              total: payload.count ?? 0,
              skip: 0,
              limit: items.length || 10,
              has_next: !!payload.next,
              has_previous: !!payload.previous
            };
          }

          if ('items' in payload || 'data' in payload) {
            const items = payload.items ?? payload.data ?? [];
            return {
              items,
              total: payload.total ?? payload.count ?? items.length,
              skip: payload.skip ?? 0,
              limit: payload.limit ?? items.length,
              has_next: payload.has_next ?? false,
              has_previous: payload.has_previous ?? false
            };
          }
        }
        
        return {
          items: [],
          total: 0,
          skip: 0,
          limit: 10,
          has_next: false,
          has_previous: false
        };
      }
    }),
    
    getOrder: builder.query<Order, number>({
      query: (id) => ({
        url: `/orders/${id}/`, 
        method: 'GET',
      }),
      providesTags: (_, __, id) => [{ type: 'Order', id }],
    }),

    createOrder: builder.mutation<Order, CreateOrderRequest>({
      query: (data) => ({
        url: '/orders/',
        method: 'POST',
        body: data,
      }),
      // 'Analytics' — чтобы "Статистика за текущий месяц" обновлялась сама, без перезагрузки страницы.
      invalidatesTags: ['Order', 'Analytics'],
    }),

    confirmOrder: builder.mutation<ConfirmOrderResponse, { id: number; confirmed: boolean }>({
      query: ({ id, confirmed }) => ({
        url: `/orders/${id}/confirm`,
        method: 'PATCH',
        body: { confirmed },
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Order', id },
        'Order',
        'Stock',
        'Analytics'
      ],
    }),

    updateOrderStatus: builder.mutation<Order, { id: number; data: UpdateOrderStatusRequest }>({
      query: ({ id, data }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Order', id }, 'Order', 'Analytics'],
    }),

    deleteOrder: builder.mutation<{ detail: string }, number>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Order', 'Analytics'],
    }),

    addOrderItem: builder.mutation<OrderItem, { orderId: number; data: CreateOrderItemRequest }>({
      query: ({ orderId, data }) => ({
        url: `/orders/${orderId}/items`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { orderId }) => [
        { type: 'Order', id: orderId },
        'Order',
      ],
    }),

    updateOrderItem: builder.mutation<OrderItem, { 
      orderId: number; 
      itemId: number; 
      data: UpdateOrderItemRequest 
    }>({
      query: ({ orderId, itemId, data }) => ({
        url: `/orders/${orderId}/items/${itemId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { orderId }) => [
        { type: 'Order', id: orderId },
        'Order',
      ],
    }),

    deleteOrderItem: builder.mutation<{ detail: string }, { orderId: number; itemId: number }>({
      query: ({ orderId, itemId }) => ({
        url: `/orders/${orderId}/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { orderId }) => [
        { type: 'Order', id: orderId },
        'Order',
      ],
    }),

    // Справочники
    getOrderStatuses: builder.query<OrderStatus[], void>({
      query: () => '/order-statuses/',
      providesTags: ['OrderStatus'],
    }),

    getCustomers: builder.query<Customer[], void>({
      query: () => '/customers/',
      // Тот же тег, что отдаёт список в customersApi ({ id: 'LIST' }).
      // Голый 'Customer' сюда не подходит: мутации клиентов сбрасывают
      // именно вариант с id 'LIST', а это по правилам RTK Query другой тег.
      providesTags: [{ type: 'Customer' as const, id: 'LIST' }],
    }),

    getMonthlyAnalytics: builder.query<MonthlyAnalyticsResponse, void>({
      query: () => ({
        url: '/analytics/monthly-summary',
        method: 'GET',
      }),
      providesTags: ['Analytics'],
      // Кешируем на 5 минут
      keepUnusedDataFor: 300,
    }),

    // ✅ ДОБАВЛЯЕМ: Новый эндпоинт для статистики продаж по месяцам
    getSalesByMonth: builder.query<MonthlySalesData[], void>({
      query: () => ({
        url: '/analytics/sales-by-month',
        method: 'GET',
      }),
      providesTags: ['Analytics'],
      keepUnusedDataFor: 300, // 5 минут кеширования
    }),

    // ✅ ДОБАВЛЯЕМ: Новый эндпоинт для KPI summary
    getKPISummary: builder.query<KPISummaryResponse, void>({
      query: () => ({
        url: '/analytics/kpi-summary',
        method: 'GET',
      }),
      providesTags: ['Analytics'],
      keepUnusedDataFor: 300, // 5 минут кеширования
    }),

    // ✅ ДОБАВЛЯЕМ: Новый эндпоинт для выручки и прибыли
    getRevenueProfitData: builder.query<RevenueProfitData[], void>({
      query: () => ({
        url: '/analytics/kpi/revenue-profit',
        method: 'GET',
      }),
      providesTags: ['Analytics'],
      keepUnusedDataFor: 300, // 5 минут кеширования
    }),

    // ✅ ДОБАВЛЯЕМ: Новый эндпоинт для получения последних заказов
    getRecentOrders: builder.query<RecentOrderItem[], { limit?: number }>({
      query: ({ limit = 5 } = {}) => ({
        url: `/analytics/recent-orders?limit=${Math.min(Math.max(limit, 1), 50)}`,
        method: 'GET',
      }),
      providesTags: ['Order', 'Analytics'],
      keepUnusedDataFor: 180, // 3 минуты кеширования
    }),

    // ✅ ДОБАВЛЯЕМ: Новый эндпоинт для сводки по статусам заказов
    getOrderStatusSummary: builder.query<OrderStatusSummaryItem[], void>({
      query: () => ({
        url: '/analytics/order-status-summary',
        method: 'GET',
      }),
      providesTags: ['Analytics', 'Order'],
      keepUnusedDataFor: 300,
    }),

    getOrderHistory: builder.query<OrderHistoryEntry[], number>({
      query: (orderId) => `/orders/${orderId}/history`,
      providesTags: (_, __, orderId) => [{ type: 'Order', id: orderId }],
    }),

    exportOrdersExcel: builder.mutation<Blob, Record<string, string | number | undefined> | void>({
      queryFn: async (filters) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const search = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== '') {
                search.append(key, String(value));
              }
            });
          }
          const response = await fetch(`${baseUrl}/orders/export-excel?${search.toString()}`, {
            credentials: 'include',
          });
          if (!response.ok) {
            return { error: { status: response.status, data: 'Не удалось экспортировать заказы' } };
          }
          return { data: await response.blob() };
        } catch (e) {
          return { error: { status: 'FETCH_ERROR', error: String(e) } };
        }
      },
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useConfirmOrderMutation,
  useUpdateOrderStatusMutation,
  useDeleteOrderMutation,
  useAddOrderItemMutation,
  useUpdateOrderItemMutation,
  useDeleteOrderItemMutation,
  useGetOrderStatusesQuery,
  useGetCustomersQuery,
  useGetMonthlyAnalyticsQuery,
  useGetSalesByMonthQuery,
  useGetKPISummaryQuery,
  useGetRevenueProfitDataQuery,
  useGetRecentOrdersQuery,
  useGetOrderStatusSummaryQuery,
  useGetOrderHistoryQuery,
  useExportOrdersExcelMutation,
} = ordersApi;