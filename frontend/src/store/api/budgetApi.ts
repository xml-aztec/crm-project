import { baseApi } from './baseApi';

// Типы данных
export interface Budget {
  id: number;
  month: string; // YYYY-MM format
  category_id: number;
  planned_amount: number;
  created_by: number;
  created_at: string;
  category?: {
    id: number;
    name: string;
  };
}

export interface CreateBudgetRequest {
  month: string;
  category_id: number;
  planned_amount: number;
}

export interface UpdateBudgetRequest {
  planned_amount?: number;
}

export interface BudgetFilters {
  month?: string; // YYYY-MM format
}

// API для бюджетов
export const budgetApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Получить все бюджеты с опциональной фильтрацией по месяцу
    getBudgets: builder.query<Budget[], BudgetFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        
        if (filters.month) {
          params.append('month', filters.month);
        }
        
        const queryString = params.toString();
        return queryString ? `budgets/?${queryString}` : 'budgets/';
      },
      providesTags: ['Budget'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    // Создать новый бюджет
    createBudget: builder.mutation<Budget, CreateBudgetRequest>({
      query: (data) => ({
        url: 'budgets/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Budget'],
    }),

    // Обновить бюджет
    updateBudget: builder.mutation<Budget, { id: number; data: UpdateBudgetRequest }>({
      query: ({ id, data }) => ({
        url: `budgets/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Budget'],
    }),

    // Удалить бюджет
    deleteBudget: builder.mutation<void, number>({
      query: (id) => ({
        url: `budgets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Budget'],
    }),
  }),
});

export const {
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetApi;