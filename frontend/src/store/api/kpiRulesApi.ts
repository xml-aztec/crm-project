import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface KPIRule {
  id: number;
  min_percent: number;
  bonus: number;
  penalty: number;
  created_at: string;
  updated_at: string;
}

export interface CreateKPIRuleRequest {
  min_percent: number;
  bonus: number;
  penalty: number;
}

export interface UpdateKPIRuleRequest {
  min_percent?: number;
  bonus?: number;
  penalty?: number;
}

export const kpiRulesApi = createApi({
  reducerPath: 'kpiRulesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['KpiRule'],
  endpoints: (builder) => ({
    // Получить все KPI правила
    getKPIRules: builder.query<KPIRule[], void>({
      query: () => 'kpi-rules/',
      providesTags: ['KpiRule'],
      keepUnusedDataFor: 300,
    }),

    // Получить KPI правило по ID
    getKPIRuleById: builder.query<KPIRule, number>({
      query: (id) => `kpi-rules/${id}`,
      providesTags: (_, __, id) => [{ type: 'KpiRule', id }],
    }),

    // Создать новое KPI правило
    createKPIRule: builder.mutation<KPIRule, CreateKPIRuleRequest>({
      query: (data) => ({
        url: 'kpi-rules/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['KpiRule'],
    }),

    // Обновить KPI правило
    updateKPIRule: builder.mutation<KPIRule, { id: number; data: UpdateKPIRuleRequest }>({
      query: ({ id, data }) => ({
        url: `kpi-rules/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'KpiRule', id }, 'KpiRule'],
    }),

    // Удалить KPI правило
    deleteKPIRule: builder.mutation<void, number>({
      query: (id) => ({
        url: `kpi-rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['KpiRule'],
    }),
  }),
});

export const {
  useGetKPIRulesQuery,
  useGetKPIRuleByIdQuery,
  useCreateKPIRuleMutation,
  useUpdateKPIRuleMutation,
  useDeleteKPIRuleMutation,
} = kpiRulesApi;