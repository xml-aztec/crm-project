import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Типы данных
export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  contact_info: string;
  address: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_person: string;
  contact_info: string;
  address: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contact_person?: string;
  contact_info?: string;
  address?: string;
}

// API для поставщиков
export const suppliersApi = createApi({
  reducerPath: 'suppliersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Supplier'],
  endpoints: (builder) => ({
    // Получить всех поставщиков
    getSuppliers: builder.query<Supplier[], void>({
      query: () => 'suppliers/',
      providesTags: ['Supplier'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    // Получить поставщика по ID
    getSupplierById: builder.query<Supplier, number>({
      query: (id) => `suppliers/${id}`,
      providesTags: (_, __, id) => [{ type: 'Supplier', id }],
    }),

    // Создать поставщика
    createSupplier: builder.mutation<Supplier, CreateSupplierRequest>({
      query: (supplier) => ({
        url: 'suppliers/',
        method: 'POST',
        body: supplier,
      }),
      invalidatesTags: ['Supplier'],
    }),

    // Обновить поставщика
    updateSupplier: builder.mutation<Supplier, { id: number; data: UpdateSupplierRequest }>({
      query: ({ id, data }) => ({
        url: `suppliers/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Supplier', id }, 'Supplier'],
    }),

    // Удалить поставщика
    deleteSupplier: builder.mutation<void, number>({
      query: (id) => ({
        url: `suppliers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Supplier'],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = suppliersApi;