import { baseApi } from './baseApi';

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'completed';
export type ReturnItemCondition = 'resalable' | 'defective';

export interface ReturnUserBrief {
  id: number;
  full_name: string | null;
  email: string;
}

export interface ReturnOrderItemProduct {
  id: number;
  name: string;
  sku?: string;
}

export interface ReturnOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  final_price: number;
  product: ReturnOrderItemProduct;
}

export interface ReturnItem {
  id: number;
  order_item_id: number;
  quantity: number;
  condition: ReturnItemCondition;
  reason: string | null;
  order_item: ReturnOrderItem;
}

export interface OrderReturn {
  id: number;
  order_id: number;
  status: ReturnStatus;
  reason: string | null;
  created_by: number | null;
  created_by_user: ReturnUserBrief | null;
  approved_by: number | null;
  approved_by_user: ReturnUserBrief | null;
  created_at: string;
  approved_at: string | null;
  items: ReturnItem[];
}

export interface CreateReturnItemRequest {
  order_item_id: number;
  quantity: number;
  condition: ReturnItemCondition;
  reason?: string;
}

export interface CreateReturnRequest {
  order_id: number;
  reason?: string;
  items: CreateReturnItemRequest[];
}

export interface ReturnDecisionRequest {
  id: number;
  approve: boolean;
  reason?: string;
}

export interface ReturnFilters {
  order_id?: number;
  status?: ReturnStatus;
  date_from?: string;
  date_to?: string;
}

export const returnsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReturns: builder.query<OrderReturn[], ReturnFilters | void>({
      query: (filters) => ({
        url: 'returns/',
        params: filters ?? undefined,
      }),
      providesTags: ['Return'],
    }),

    createReturn: builder.mutation<OrderReturn, CreateReturnRequest>({
      query: (data) => ({
        url: 'returns/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Return', 'Order', 'Stock'],
    }),

    decideReturn: builder.mutation<OrderReturn, ReturnDecisionRequest>({
      query: ({ id, approve, reason }) => ({
        url: `returns/${id}/decision`,
        method: 'PATCH',
        body: { approve, reason },
      }),
      invalidatesTags: ['Return', 'Order', 'Stock'],
    }),
  }),
});

export const {
  useGetReturnsQuery,
  useCreateReturnMutation,
  useDecideReturnMutation,
} = returnsApi;
