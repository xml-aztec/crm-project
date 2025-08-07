import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface CashGap {
  id: number;
  month: string; // YYYY-MM format
  expected_income: number; // ✅ Исправляем названия полей
  expected_expense: number; // ✅ Исправляем названия полей
  gap_amount: number; // ✅ Добавляем вычисляемое поле разрыва
  comment: string; // ✅ Добавляем комментарий
  created_at: string;
  updated_at: string;
}

export interface CashGapFilters {
  month?: string; // YYYY-MM format
}

export interface CreateCashGapRequest {
  month: string;
  expected_income: number; // ✅ Исправляем названия полей
  expected_expense: number; // ✅ Исправляем названия полей
  comment: string; // ✅ Добавляем комментарий
}

export interface UpdateCashGapRequest {
  expected_income?: number; // ✅ Исправляем названия полей
  expected_expense?: number; // ✅ Исправляем названия полей
  comment?: string; // ✅ Добавляем комментарий
}

export const cashGapApi = createApi({
  reducerPath: 'cashGapApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['CashGap'],
  endpoints: (builder) => ({
    // ✅ ИСПРАВЛЯЕМ: Правильное название метода
    getCashGaps: builder.query<CashGap[], CashGapFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        
        if (filters.month) {
          params.append('month', filters.month);
        }
        
        const queryString = params.toString();
        return queryString ? `cash-gap/?${queryString}` : 'cash-gap/';
      },
      providesTags: ['CashGap'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    // Получить кэш-гэп по ID
    getCashGapById: builder.query<CashGap, number>({
      query: (id) => `cash-gap/${id}`,
      providesTags: (_, __, id) => [{ type: 'CashGap', id }],
    }),

    // Создать новый кэш-гэп
    createCashGap: builder.mutation<CashGap, CreateCashGapRequest>({
      query: (data) => ({
        url: 'cash-gap/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CashGap'],
    }),

    // Обновить кэш-гэп
    updateCashGap: builder.mutation<CashGap, { id: number; data: UpdateCashGapRequest }>({
      query: ({ id, data }) => ({
        url: `cash-gap/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'CashGap', id }, 'CashGap'],
    }),

    // Удалить кэш-гэп
    deleteCashGap: builder.mutation<void, number>({
      query: (id) => ({
        url: `cash-gap/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CashGap'],
    }),
  }),
});

export const {
  useGetCashGapsQuery, // ✅ ЭКСПОРТИРУЕМ правильное название
  useGetCashGapByIdQuery,
  useCreateCashGapMutation,
  useUpdateCashGapMutation,
  useDeleteCashGapMutation,
} = cashGapApi;