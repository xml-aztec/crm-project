import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';

export interface CashflowType {
  id: number;
  name: string;
  category_id?: number;
  category?: { id: number; name: string; type: 'income' | 'expense' };
}

export interface CashflowCategory {
  id: number;
  name: string;
  type?: 'income' | 'expense';
}

export interface CashflowEntry {
  id: number;
  date: string;
  amount: number;
  type: CashflowType;
  category?: CashflowCategory;
  source?: string;
  entity_id?: number;
  description?: string;
}

export interface CashflowFilters {
  from_date?: string;
  to_date?: string;
  type_name?: string;
  category_name?: string;
}

export interface CreateCashflowCategoryRequest {
  name: string;
  type?: 'income' | 'expense';
}

export interface UpdateCashflowCategoryRequest {
  name?: string;
  type?: 'income' | 'expense';
}

export interface CreateCashflowTypeRequest {
  name: string;
  category_id?: number;
}

export interface UpdateCashflowTypeRequest {
  name: string;
}

export const cashflowApi = createApi({
  reducerPath: 'cashflowApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['CashflowCategory', 'CashflowType', 'CashflowEntry'],
  endpoints: (builder) => ({
    // === КАТЕГОРИИ ===
    getCashflowCategories: builder.query<CashflowCategory[], void>({
      query: () => 'cashflow-meta/categories',
      providesTags: ['CashflowCategory'],
    }),

    createCashflowCategory: builder.mutation<CashflowCategory, CreateCashflowCategoryRequest>({
      query: (data) => ({ url: 'cashflow-meta/categories', method: 'POST', body: data }),
      invalidatesTags: ['CashflowCategory'],
    }),

    updateCashflowCategory: builder.mutation<CashflowCategory, { id: number; data: UpdateCashflowCategoryRequest }>({
      query: ({ id, data }) => ({ url: `cashflow-meta/categories/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['CashflowCategory'],
    }),

    deleteCashflowCategory: builder.mutation<void, number>({
      query: (id) => ({ url: `cashflow-meta/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CashflowCategory'],
    }),

    // === ТИПЫ ===
    getCashflowTypes: builder.query<CashflowType[], void>({
      query: () => 'cashflow-meta/types',
      providesTags: ['CashflowType'],
    }),

    createCashflowType: builder.mutation<CashflowType, CreateCashflowTypeRequest>({
      query: (data) => ({ url: 'cashflow-meta/types', method: 'POST', body: data }),
      invalidatesTags: ['CashflowType'],
    }),

    updateCashflowType: builder.mutation<CashflowType, { id: number; data: UpdateCashflowTypeRequest }>({
      query: ({ id, data }) => ({ url: `cashflow-meta/types/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['CashflowType'],
    }),

    deleteCashflowType: builder.mutation<void, number>({
      query: (id) => ({ url: `cashflow-meta/types/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CashflowType'],
    }),

    // === ЗАПИСИ ===
    getCashflowEntries: builder.query<CashflowEntry[], CashflowFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.from_date) params.append('from_date', filters.from_date);
        if (filters.to_date) params.append('to_date', filters.to_date);
        if (filters.type_name) params.append('type_name', filters.type_name);
        if (filters.category_name) params.append('category_name', filters.category_name);
        const qs = params.toString();
        return qs ? `cash-flows/?${qs}` : 'cash-flows/';
      },
      providesTags: ['CashflowEntry'],
    }),

    exportCashflowPdf: builder.mutation<Blob, CashflowFilters>({
      queryFn: async (filters) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const params = new URLSearchParams();
          if (filters.from_date) params.append('from_date', filters.from_date);
          if (filters.to_date) params.append('to_date', filters.to_date);
          if (filters.type_name) params.append('type_name', filters.type_name);
          if (filters.category_name) params.append('category_name', filters.category_name);
          const response = await fetch(`${baseUrl}/cash-flows/export-pdf?${params.toString()}`, {
            credentials: 'include',
          });
          if (!response.ok) {
            return { error: { status: response.status, data: 'Не удалось экспортировать отчёт' } };
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
  useGetCashflowCategoriesQuery,
  useCreateCashflowCategoryMutation,
  useUpdateCashflowCategoryMutation,
  useDeleteCashflowCategoryMutation,
  useGetCashflowTypesQuery,
  useCreateCashflowTypeMutation,
  useUpdateCashflowTypeMutation,
  useDeleteCashflowTypeMutation,
  useGetCashflowEntriesQuery,
  useExportCashflowPdfMutation,
} = cashflowApi;
