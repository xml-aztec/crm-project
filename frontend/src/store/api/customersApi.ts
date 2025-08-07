import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  customer_type_id: number;
  address?: string; // Сделали необязательным
  created_at: string;
  customer_type?: {
    id: number;
    name: string;
  };
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email: string;
  customer_type_id: number;
  address?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  email?: string;
  customer_type_id?: number;
  address?: string;
}

export const customersApi = createApi({
  reducerPath: 'customersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Customer'],
  endpoints: (builder) => ({
    getCustomers: builder.query<Customer[], void>({
      query: () => '/customers',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Customer' as const, id })),
              { type: 'Customer', id: 'LIST' },
            ]
          : [{ type: 'Customer', id: 'LIST' }],
    }),
    getCustomerById: builder.query<Customer, number>({
      query: (id) => `/customers/${id}`,
      providesTags: (_, __, id) => [{ type: 'Customer', id }],
    }),
    createCustomer: builder.mutation<Customer, CreateCustomerRequest>({
      query: (newCustomer) => ({
        url: '/customers',
        method: 'POST',
        body: newCustomer,
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
    updateCustomer: builder.mutation<Customer, { id: number; data: UpdateCustomerRequest }>({
      query: ({ id, data }) => ({
        url: `/customers/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
      ],
    }),
    deleteCustomer: builder.mutation<void, number>({
      query: (id) => ({
        url: `/customers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = customersApi;