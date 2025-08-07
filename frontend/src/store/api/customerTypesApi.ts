import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface CustomerType {
  id: number;
  name: string;
  created_at?: string;
}

export interface CreateCustomerTypeRequest {
  name: string;
}

export interface UpdateCustomerTypeRequest {
  name: string;
}

export const customerTypesApi = createApi({
  reducerPath: 'customerTypesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['CustomerType'],
  endpoints: (builder) => ({
    getCustomerTypes: builder.query<CustomerType[], void>({
      query: () => '/customer-types',
      providesTags: ['CustomerType'],
    }),
    createCustomerType: builder.mutation<CustomerType, CreateCustomerTypeRequest>({
      query: (data) => ({
        url: '/customer-types',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CustomerType'],
    }),
    updateCustomerType: builder.mutation<CustomerType, { id: number; data: UpdateCustomerTypeRequest }>({
      query: ({ id, data }) => ({
        url: `/customer-types/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['CustomerType'],
    }),
    deleteCustomerType: builder.mutation<void, number>({
      query: (id) => ({
        url: `/customer-types/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CustomerType'],
    }),
  }),
});

export const {
  useGetCustomerTypesQuery,
  useCreateCustomerTypeMutation,
  useUpdateCustomerTypeMutation,
  useDeleteCustomerTypeMutation,
} = customerTypesApi;