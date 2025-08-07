import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface MonthlyTarget {
  id: number;
  month: string; // YYYY-MM format
  target_revenue: number;
  target_orders: number;
  target_customers: number;
  actual_revenue?: number;
  actual_orders?: number;
  actual_customers?: number;
  revenue_achievement?: number; // percentage
  orders_achievement?: number; // percentage
  customers_achievement?: number; // percentage
  created_at: string;
  updated_at: string;
}

export interface CreateMonthlyTargetRequest {
  month: string;
  target_revenue: number;
  target_orders: number;
  target_customers: number;
}

export interface UpdateMonthlyTargetRequest {
  target_revenue?: number;
  target_orders?: number;
  target_customers?: number;
}

export interface MonthlyTargetFilters {
  month?: string; // YYYY-MM format
  year?: number;
}

export const monthlyTargetsApi = createApi({
  reducerPath: 'monthlyTargetsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['MonthlyTarget'],
  endpoints: (builder) => ({
    // Получить все месячные цели с фильтрацией
    getMonthlyTargets: builder.query<MonthlyTarget[], MonthlyTargetFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        
        if (filters.month) {
          params.append('month', filters.month);
        }
        if (filters.year) {
          params.append('year', filters.year.toString());
        }
        
        const queryString = params.toString();
        return queryString ? `monthly-targets/?${queryString}` : 'monthly-targets/';
      },
      providesTags: ['MonthlyTarget'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    // Получить месячную цель по ID
    getMonthlyTargetById: builder.query<MonthlyTarget, number>({
      query: (id) => `monthly-targets/${id}`,
      providesTags: (_, __, id) => [{ type: 'MonthlyTarget', id }],
    }),

    // Создать новую месячную цель
    createMonthlyTarget: builder.mutation<MonthlyTarget, CreateMonthlyTargetRequest>({
      query: (data) => ({
        url: 'monthly-targets/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['MonthlyTarget'],
    }),

    // Обновить месячную цель
    updateMonthlyTarget: builder.mutation<MonthlyTarget, { id: number; data: UpdateMonthlyTargetRequest }>({
      query: ({ id, data }) => ({
        url: `monthly-targets/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'MonthlyTarget', id }, 'MonthlyTarget'],
    }),

    // Удалить месячную цель
    deleteMonthlyTarget: builder.mutation<void, number>({
      query: (id) => ({
        url: `monthly-targets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MonthlyTarget'],
    }),

    // Получить достижения за текущий месяц
    getCurrentMonthAchievements: builder.query<MonthlyTarget, void>({
      query: () => {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        return `monthly-targets/current?month=${currentMonth}`;
      },
      providesTags: ['MonthlyTarget'],
      keepUnusedDataFor: 60, // 1 минута для актуальных данных
    }),
  }),
});

export const {
  useGetMonthlyTargetsQuery,
  useGetMonthlyTargetByIdQuery,
  useCreateMonthlyTargetMutation,
  useUpdateMonthlyTargetMutation,
  useDeleteMonthlyTargetMutation,
  useGetCurrentMonthAchievementsQuery,
} = monthlyTargetsApi;