import { baseApi } from './baseApi';

export interface MonthlyTarget {
  id: number;
  manager_id: number;
  month: string; // YYYY-MM-DD format
  target_amount: number;
  actual_amount?: number;
  achievement_percentage?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMonthlyTargetRequest {
  manager_id: number;
  month: string;
  target_amount: number;
}

export interface UpdateMonthlyTargetRequest {
  target_amount?: number;
}

export interface MonthlyTargetFilters {
  month?: string;
  manager_id?: number;
}

export const monthlyTargetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Получить все месячные цели с фильтрацией
    getMonthlyTargets: builder.query<MonthlyTarget[], MonthlyTargetFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.month) params.append('month', filters.month);
        if (filters.manager_id) params.append('manager_id', filters.manager_id.toString());
        return `/?${params.toString()}`;
      },
      providesTags: ['MonthlyTarget'],
    }),

    // Получить месячную цель по ID
    getMonthlyTargetById: builder.query<MonthlyTarget, number>({
      query: (id) => `/${id}`,
      providesTags: ['MonthlyTarget'],
    }),

    // Создать новую месячную цель
    createMonthlyTarget: builder.mutation<MonthlyTarget, CreateMonthlyTargetRequest>({
      query: (data) => ({
        url: '/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['MonthlyTarget'],
    }),

    // Обновить месячную цель
    updateMonthlyTarget: builder.mutation<MonthlyTarget, { id: number; data: UpdateMonthlyTargetRequest }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['MonthlyTarget'],
    }),

    // Удалить месячную цель
    deleteMonthlyTarget: builder.mutation<void, number>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MonthlyTarget'],
    }),

    // Добавляем новую мутацию для создания/обновления
    createOrUpdateMonthlyTarget: builder.mutation<MonthlyTarget, CreateMonthlyTargetRequest>({
      query: (data) => ({
        url: '/create-or-update',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['MonthlyTarget'],
    }),
  }),
});

export const {
  useGetMonthlyTargetsQuery,
  useGetMonthlyTargetByIdQuery,
  useCreateMonthlyTargetMutation,
  useUpdateMonthlyTargetMutation,
  useDeleteMonthlyTargetMutation,
  useCreateOrUpdateMonthlyTargetMutation,
} = monthlyTargetsApi;