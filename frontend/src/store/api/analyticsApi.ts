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
  }),
});

export const {
  useGetPnlReportQuery,
  useGetPnlYearlyQuery,
  useGetMonthlyTargetSummaryQuery,
} = analyticsApi;
