import { baseApi } from './baseApi';

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

export interface SupplierPage {
  items: Supplier[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SuppliersPaginationParams {
  search?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

// API для поставщиков
export const suppliersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Получить всех поставщиков
    getSuppliers: builder.query<Supplier[], void>({
      query: () => 'suppliers/',
      providesTags: ['Supplier'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    // Получить поставщиков с серверной пагинацией и поиском
    getSuppliersPaginated: builder.query<SupplierPage, SuppliersPaginationParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              search.append(key, String(value));
            }
          });
        }
        return `suppliers/paginated?${search.toString()}`;
      },
      providesTags: ['Supplier'],
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
  useGetSuppliersPaginatedQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = suppliersApi;