import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface PaymentMethod {
  id: number;
  name: string;
  surcharge_percent: number;
  max_months: number | null;
}

export interface CreatePaymentMethodRequest {
  name: string;
  surcharge_percent: number;
  max_months?: number | null;
}

export interface UpdatePaymentMethodRequest {
  name?: string;
  surcharge_percent?: number;
  max_months?: number | null;
}

export const paymentMethodsApi = createApi({
  reducerPath: 'paymentMethodsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['PaymentMethod'],
  endpoints: (builder) => ({
    getPaymentMethods: builder.query<PaymentMethod[], void>({
      query: () => '/payment-methods',
      providesTags: ['PaymentMethod'],
    }),
    createPaymentMethod: builder.mutation<PaymentMethod, CreatePaymentMethodRequest>({
      query: (data) => ({
        url: '/payment-methods',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['PaymentMethod'],
    }),
    updatePaymentMethod: builder.mutation<PaymentMethod, { id: number; data: UpdatePaymentMethodRequest }>({
      query: ({ id, data }) => ({
        url: `/payment-methods/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['PaymentMethod'],
    }),
    deletePaymentMethod: builder.mutation<void, number>({
      query: (id) => ({
        url: `/payment-methods/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PaymentMethod'],
    }),
  }),
});

export const {
  useGetPaymentMethodsQuery,
  useCreatePaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
} = paymentMethodsApi;