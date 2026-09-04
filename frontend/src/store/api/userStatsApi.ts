import { baseApi } from './baseApi';

export interface UserStats {
  orders_count: number;
  total_income: number;
  avg_check?: number;
  avg_items_per_order?: number;
  canceled_orders?: number;
  canceled_share?: number;
  orders_by_clients?: Array<{
    customer_id: number;
    orders: number;
  }>;
  top_products?: Array<{
    name: string;
    total_sold: number;
  }>;
}

export interface UserStatsFilters {
  year?: number;
  month?: number;
}

export const userStatsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ✅ ОСТАВЛЯЕМ ТОЛЬКО ОДИН ЭНДПОИНТ - получить статистику пользователя по ID
    getUserStatsById: builder.query<UserStats, { userId: number } & UserStatsFilters>({
      query: ({ userId, ...filters }) => {
        const params = new URLSearchParams();
        
        if (filters.year) {
          params.append('year', filters.year.toString());
        }
        if (filters.month) {
          params.append('month', filters.month.toString());
        }
        
        const queryString = params.toString();
        return queryString ? `users/${userId}/stats?${queryString}` : `users/${userId}/stats`;
      },
      providesTags: (_result, _error, { userId }) => [
        { type: 'UserStats', id: userId }
      ],
      keepUnusedDataFor: 300, // 5 минут
    }),
  }),
});

export const {
  useGetUserStatsByIdQuery,
} = userStatsApi;