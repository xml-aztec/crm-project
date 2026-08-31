import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Stock {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  reserved: number;
  available: number;
  defective_quantity: number;
  updated_at: string;
  product?: {
    id: number;
    name: string;
    sku: string;
    barcode: string;
    price: number;
    category_id: number;
    brand_id: number;
  };
  warehouse?: {
    id: number;
    name: string;
    location: string;
    branch_id: number;
  };
}

export interface StockResponse {
  stocks: Stock[];
  stats: StockStats;
}

export interface StockFilters {
  product_id?: number;
  warehouse_id?: number;
  sku?: string;
  barcode?: string;
  name?: string;
  stock_level?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  skip?: number;
  limit?: number;
}

export interface CreateStockRequest {
  product_id: number;
  warehouse_id: number;
  quantity: number;
}

export interface UpdateStockRequest {
  quantity: number;
}

export interface StockTransferRequest {
  from_warehouse_id: number;
  to_warehouse_id: number;
  product_id: number;
  quantity: number;
}

export interface StockStats {
  total: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_quantity: number;
}

export const stockApi = createApi({
  reducerPath: 'stockApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Stock'],
  endpoints: (builder) => ({
    getStock: builder.query<StockResponse, StockFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.product_id) {
          params.append('product_id', filters.product_id.toString());
        }
        if (filters.warehouse_id) {
          params.append('warehouse_id', filters.warehouse_id.toString());
        }

        if (filters.sku?.trim()) {
          params.append('sku', filters.sku.trim());
        }
        if (filters.barcode?.trim()) {
          params.append('barcode', filters.barcode.trim());
        }
        if (filters.name?.trim()) {
          params.append('name', filters.name.trim());
        }

        if (filters.stock_level && filters.stock_level !== 'all') {
          params.append('stock_level', filters.stock_level);
        }

        if (filters.skip) {
          params.append('skip', filters.skip.toString());
        }
        if (filters.limit) {
          params.append('limit', filters.limit.toString());
        }

        return `stock/?${params.toString()}`;
      },
      providesTags: ['Stock'],
      keepUnusedDataFor: 300,
    }),

    getStockById: builder.query<Stock, number>({
      query: (id) => `stock/${id}`,
      providesTags: (_, __, id) => [{ type: 'Stock', id }],
    }),

    createStock: builder.mutation<Stock, CreateStockRequest>({
      query: (stock) => ({
        url: 'stock/',
        method: 'POST',
        body: stock,
      }),
      invalidatesTags: ['Stock'],
    }),

    updateStock: builder.mutation<Stock, { id: number; data: UpdateStockRequest }>({
      query: ({ id, data }) => ({
        url: `stock/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Stock', id }, 'Stock'],
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          stockApi.util.updateQueryData('getStock', {}, (draft) => {
            const stock = draft.stocks.find(item => item.id === id);
            if (stock) {
              stock.quantity = data.quantity;
              stock.updated_at = new Date().toISOString();
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    transferStock: builder.mutation<{ detail: string }, StockTransferRequest>({
      query: (data) => ({
        url: 'stock/transfer',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Stock'],
    }),

    deleteStock: builder.mutation<void, number>({
      query: (id) => ({
        url: `warehouse/stock/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Stock'],
    }),
  }),
});

export const {
  useGetStockQuery,
  useGetStockByIdQuery,
  useCreateStockMutation,
  useUpdateStockMutation,
  useTransferStockMutation,
  useDeleteStockMutation,
} = stockApi;
