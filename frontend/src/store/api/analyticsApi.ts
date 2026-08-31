import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';

export interface PnLReport {
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  payroll_total: number;
  net_profit: number;
  gross_margin_percent: number;
  net_margin_percent: number;
}

export interface MonthlyTargetSummary {
  target: number;
  revenue: number;
  today_revenue: number;
  progress_percent: number;
}

export interface PnLMonthly {
  month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  payroll_total: number;
  net_profit: number;
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getPnlReport: builder.query<PnLReport, { year: number; month: number }>({
      query: ({ year, month }) => `analytics/pnl?year=${year}&month=${month}`,
    }),
    getPnlYearly: builder.query<PnLMonthly[], { year: number }>({
      query: ({ year }) => `analytics/pnl/yearly?year=${year}`,
    }),
    getMonthlyTargetSummary: builder.query<MonthlyTargetSummary, void>({
      query: () => 'analytics/monthly-target-summary',
    }),
    exportPnlPdf: builder.mutation<Blob, { year: number; month: number }>({
      queryFn: async ({ year, month }) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(
            `${baseUrl}/analytics/pnl/export-pdf?year=${year}&month=${month}`,
            { credentials: 'include' }
          );
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
  useGetPnlReportQuery,
  useGetPnlYearlyQuery,
  useGetMonthlyTargetSummaryQuery,
  useExportPnlPdfMutation,
} = analyticsApi;
