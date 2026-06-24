import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface StockLog {
  id: number;
  product_id: number;
  warehouse_id: number;
  order_id?: number | null;
  type: 'incoming' | 'outgoing' | 'return' | 'adjust';
  quantity: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface StockLogsFilters {
  product_id?: number;
  warehouse_id?: number;
  order_id?: number;
  type?: 'incoming' | 'outgoing' | 'return' | 'adjust';
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

// API для логов движения товаров
export const stockLogsApi = createApi({
  reducerPath: 'stockLogsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['StockLog'],
  endpoints: (builder) => ({
    // Получить логи движения товаров с фильтрацией
    getStockLogs: builder.query<StockLog[], StockLogsFilters>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        if (params.product_id) {
          searchParams.append('product_id', params.product_id.toString());
        }
        if (params.warehouse_id) {
          searchParams.append('warehouse_id', params.warehouse_id.toString());
        }
        if (params.order_id) {
          searchParams.append('order_id', params.order_id.toString());
        }
        if (params.type) {
          searchParams.append('type', params.type);
        }
        if (params.date_from) {
          searchParams.append('date_from', params.date_from);
        }
        if (params.date_to) {
          searchParams.append('date_to', params.date_to);
        }
        
        // Обязательные параметры пагинации
        searchParams.append('skip', (params.skip ?? 0).toString());
        searchParams.append('limit', (params.limit ?? 20).toString());

        return {
          url: `stock/logs/?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['StockLog'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    // Получить логи движения для конкретного заказа
    getOrderStockLogs: builder.query<StockLog[], number>({
      query: (orderId) => `orders/${orderId}/stock-logs/`,
      providesTags: ['StockLog'],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useGetStockLogsQuery,
  useGetOrderStockLogsQuery,
} = stockLogsApi;