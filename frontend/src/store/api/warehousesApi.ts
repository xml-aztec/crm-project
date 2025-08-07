import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Типы данных для склада
export interface Warehouse {
  id: number;
  name: string;
  location: string;
  address: string;
  branch_id: number;
  branch_name?: string;
}

export interface CreateWarehouseRequest {
  name: string;
  location: string;
  address: string;
  branch_id: number;
}

export interface UpdateWarehouseRequest {
  name?: string;
  location?: string;
  address?: string;
  branch_id?: number;
}

// API для складов
export const warehousesApi = createApi({
  reducerPath: 'warehousesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Warehouse'],
  endpoints: (builder) => ({
    // Получить все склады
    getWarehouses: builder.query<Warehouse[], void>({
      query: () => 'warehouses/',
      providesTags: ['Warehouse'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    // Получить склад по ID
    getWarehouseById: builder.query<Warehouse, number>({
      query: (id) => `warehouses/${id}`,
      providesTags: (_, __, id) => [{ type: 'Warehouse', id }],
    }),

    // Создать склад
    createWarehouse: builder.mutation<Warehouse, CreateWarehouseRequest>({
      query: (warehouse) => ({
        url: 'warehouses/',
        method: 'POST',
        body: warehouse,
      }),
      invalidatesTags: ['Warehouse'],
    }),

    // Обновить склад
    updateWarehouse: builder.mutation<Warehouse, { id: number; data: UpdateWarehouseRequest }>({
      query: ({ id, data }) => ({
        url: `warehouses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Warehouse', id }, 'Warehouse'],
    }),

    // Удалить склад
    deleteWarehouse: builder.mutation<void, number>({
      query: (id) => ({
        url: `warehouses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Warehouse'],
    }),
  }),
});

export const {
  useGetWarehousesQuery,
  useGetWarehouseByIdQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
} = warehousesApi;