import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Payroll {
  id: number;
  user_id: number;
  month: string; // YYYY-MM format
  base_salary: number;
  bonus_amount?: number; // ✅ Исправляем название поля
  penalty_amount?: number; // ✅ Исправляем название поля
  kpi_percent?: number;
  kpi_rule_id?: number;
  total_paid: number; // ✅ Добавляем поле для итоговой суммы
  paid_at?: string; // ✅ Добавляем поле для даты выплаты
  comment?: string;
  hours_worked?: number;
  overtime_hours?: number;
  created_at: string;
  updated_at?: string;
  user?: {
    id: number;
    full_name: string;
    position?: {
      id: number;
      name: string;
    };
  };
}

export interface CreatePayrollRequest {
  user_id: number;
  month: string;
  base_salary: number;
  bonus_amount?: number;
  penalty_amount?: number;
  kpi_percent?: number;
  kpi_rule_id?: number;
  hours_worked?: number;
  overtime_hours?: number;
  comment?: string;
}

export interface UpdatePayrollRequest {
  base_salary?: number;
  bonus_amount?: number;
  penalty_amount?: number;
  kpi_percent?: number;
  kpi_rule_id?: number;
  hours_worked?: number;
  overtime_hours?: number;
  comment?: string;
}

export interface PayrollFilters {
  month?: string; // YYYY-MM format
  user_id?: number;
  only_paid?: boolean; // ✅ Добавляем фильтр по выплаченным
}

export interface GeneratePayrollsRequest {
  month: string;
}

export interface PayPayrollRequest {
  id: number;
  comment?: string;
}

export const payrollApi = createApi({
  reducerPath: 'payrollApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Payroll'],
  endpoints: (builder) => ({
    // Получить все записи зарплат с фильтрацией
    getPayrolls: builder.query<Payroll[], PayrollFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        
        if (filters.month) {
          params.append('month', filters.month);
        }
        if (filters.user_id) {
          params.append('user_id', filters.user_id.toString());
        }
        if (filters.only_paid !== undefined) {
          params.append('only_paid', filters.only_paid.toString());
        }
        
        const queryString = params.toString();
        return queryString ? `payrolls/?${queryString}` : 'payrolls/';
      },
      providesTags: ['Payroll'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    // Получить запись зарплаты по ID
    getPayrollById: builder.query<Payroll, number>({
      query: (id) => `payrolls/${id}`,
      providesTags: (_, __, id) => [{ type: 'Payroll', id }],
    }),

    // ✅ ДОБАВЛЯЕМ: Генерация зарплат за месяц
    generatePayrolls: builder.mutation<{ message: string; created_count: number }, GeneratePayrollsRequest>({
      query: (data) => ({
        url: 'payrolls/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payroll'],
    }),

    // ✅ ДОБАВЛЯЕМ: Выплата зарплаты
    payPayroll: builder.mutation<Payroll, PayPayrollRequest>({
      query: ({ id, comment }) => ({
        url: `payrolls/${id}/pay`,
        method: 'PATCH',
        body: comment ? { comment } : {},
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Payroll', id }, 'Payroll'],
    }),

    // ✅ ДОБАВЛЯЕМ: Пересчет зарплаты
    recalculatePayroll: builder.mutation<Payroll, number>({
      query: (id) => ({
        url: `payrolls/${id}/recalculate`,
        method: 'PATCH',
      }),
      invalidatesTags: (_, __, id) => [{ type: 'Payroll', id }, 'Payroll'],
    }),

    // Создать новую запись зарплаты
    createPayroll: builder.mutation<Payroll, CreatePayrollRequest>({
      query: (data) => ({
        url: 'payrolls/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payroll'],
    }),

    // Обновить запись зарплаты
    updatePayroll: builder.mutation<Payroll, { id: number; data: UpdatePayrollRequest }>({
      query: ({ id, data }) => ({
        url: `payrolls/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Payroll', id }, 'Payroll'],
    }),

    // Удалить запись зарплаты
    deletePayroll: builder.mutation<void, number>({
      query: (id) => ({
        url: `payrolls/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payroll'],
    }),
  }),
});

export const {
  useGetPayrollsQuery,
  useGetPayrollByIdQuery,
  useGeneratePayrollsMutation, // ✅ ЭКСПОРТИРУЕМ
  usePayPayrollMutation, // ✅ ЭКСПОРТИРУЕМ
  useRecalculatePayrollMutation, // ✅ ЭКСПОРТИРУЕМ
  useCreatePayrollMutation,
  useUpdatePayrollMutation,
  useDeletePayrollMutation,
} = payrollApi;