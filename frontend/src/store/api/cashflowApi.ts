import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface CashflowCategory {
  id: number;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  created_at: string;
}

export interface CashflowType {
  id: number;
  name: string;
  category_id: number;
  description?: string;
  created_at: string;
  category?: CashflowCategory;
}

export interface CashflowEntry {
  id: number;
  type_id: number;
  amount: number;
  description?: string;
  date: string;
  created_at: string;
  type?: CashflowType;
}

export interface CreateCashflowCategoryRequest {
  name: string;
  type: 'income' | 'expense';
  description?: string;
}

export interface UpdateCashflowCategoryRequest {
  name?: string;
  type?: 'income' | 'expense';
  description?: string;
}

export interface CreateCashflowTypeRequest {
  name: string;
  category_id: number;
  description?: string;
}

export interface UpdateCashflowTypeRequest {
  name?: string;
  category_id?: number;
  description?: string;
}

export interface CreateCashflowEntryRequest {
  type_id: number;
  amount: number;
  description?: string;
  date: string;
}

export interface UpdateCashflowEntryRequest {
  type_id?: number;
  amount?: number;
  description?: string;
  date?: string;
}

export interface CashflowFilters {
  type_id?: number;
  category_id?: number;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

export const cashflowApi = createApi({
  reducerPath: 'cashflowApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['CashflowCategory', 'CashflowType', 'CashflowEntry'],
  endpoints: (builder) => ({
    // === КАТЕГОРИИ ===
    getCashflowCategories: builder.query<CashflowCategory[], void>({
      query: () => 'cashflow-meta/categories',
      providesTags: ['CashflowCategory'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    createCashflowCategory: builder.mutation<CashflowCategory, CreateCashflowCategoryRequest>({
      query: (data) => ({
        url: 'cashflow-meta/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CashflowCategory'],
    }),

    updateCashflowCategory: builder.mutation<CashflowCategory, { id: number; data: UpdateCashflowCategoryRequest }>({
      query: ({ id, data }) => ({
        url: `cashflow-meta/categories/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'CashflowCategory', id }, 'CashflowCategory'],
    }),

    deleteCashflowCategory: builder.mutation<void, number>({
      query: (id) => ({
        url: `cashflow-meta/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CashflowCategory'],
    }),

    // === ТИПЫ ===
    getCashflowTypes: builder.query<CashflowType[], void>({
      query: () => 'cashflow-meta/types',
      providesTags: ['CashflowType'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    createCashflowType: builder.mutation<CashflowType, CreateCashflowTypeRequest>({
      query: (data) => ({
        url: 'cashflow-meta/types',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CashflowType'],
    }),

    updateCashflowType: builder.mutation<CashflowType, { id: number; data: UpdateCashflowTypeRequest }>({
      query: ({ id, data }) => ({
        url: `cashflow-meta/types/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'CashflowType', id }, 'CashflowType'],
    }),

    deleteCashflowType: builder.mutation<void, number>({
      query: (id) => ({
        url: `cashflow-meta/types/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CashflowType'],
    }),

    // === ЗАПИСИ ДВИЖЕНИЯ ДЕНЕЖНЫХ СРЕДСТВ ===
    getCashflowEntries: builder.query<CashflowEntry[], CashflowFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        
        if (filters.type_id) {
          params.append('type_id', filters.type_id.toString());
        }
        if (filters.category_id) {
          params.append('category_id', filters.category_id.toString());
        }
        if (filters.date_from) {
          params.append('date_from', filters.date_from);
        }
        if (filters.date_to) {
          params.append('date_to', filters.date_to);
        }
        if (filters.amount_min) {
          params.append('amount_min', filters.amount_min.toString());
        }
        if (filters.amount_max) {
          params.append('amount_max', filters.amount_max.toString());
        }
        
        const queryString = params.toString();
        return queryString ? `cashflow/?${queryString}` : 'cashflow/';
      },
      providesTags: ['CashflowEntry'],
      keepUnusedDataFor: 300,
    }),

    getCashflowEntryById: builder.query<CashflowEntry, number>({
      query: (id) => `cashflow/${id}`,
      providesTags: (_, __, id) => [{ type: 'CashflowEntry', id }],
    }),

    createCashflowEntry: builder.mutation<CashflowEntry, CreateCashflowEntryRequest>({
      query: (data) => ({
        url: 'cashflow/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CashflowEntry'],
    }),

    updateCashflowEntry: builder.mutation<CashflowEntry, { id: number; data: UpdateCashflowEntryRequest }>({
      query: ({ id, data }) => ({
        url: `cashflow/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'CashflowEntry', id }, 'CashflowEntry'],
    }),

    deleteCashflowEntry: builder.mutation<void, number>({
      query: (id) => ({
        url: `cashflow/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CashflowEntry'],
    }),
  }),
});

export const {
  // Категории
  useGetCashflowCategoriesQuery,
  useCreateCashflowCategoryMutation,
  useUpdateCashflowCategoryMutation,
  useDeleteCashflowCategoryMutation,
  
  // Типы
  useGetCashflowTypesQuery,
  useCreateCashflowTypeMutation,
  useUpdateCashflowTypeMutation,
  useDeleteCashflowTypeMutation,
  
  // Записи
  useGetCashflowEntriesQuery,
  useGetCashflowEntryByIdQuery,
  useCreateCashflowEntryMutation,
  useUpdateCashflowEntryMutation,
  useDeleteCashflowEntryMutation,
} = cashflowApi;