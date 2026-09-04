import { baseApi } from './baseApi';

// Приведено в соответствие со схемой бэкенда (backend/app/schemas/customer.py):
// обязательным там является ТОЛЬКО name, остальное Optional. Раньше здесь
// phone, email и customer_type_id были помечены обязательными, из-за чего
// формы, которые их не собирают (быстрое создание клиента в заказе), не
// проходили типизацию, а данные без email считались невозможными.
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  customer_type_id?: number;
  address?: string;
  created_at: string;
  customer_type?: {
    id: number;
    name: string;
  };
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  customer_type_id?: number;
  address?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  email?: string;
  customer_type_id?: number;
  address?: string;
}

export interface CustomerPage {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CustomersPaginationParams {
  search?: string;
  customer_type_id?: number;
  sort_by?: 'name' | 'email' | 'created_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export const customersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<Customer[], void>({
      query: () => '/customers/',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Customer' as const, id })),
              { type: 'Customer', id: 'LIST' },
            ]
          : [{ type: 'Customer', id: 'LIST' }],
    }),
    getCustomersPaginated: builder.query<CustomerPage, CustomersPaginationParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              search.append(key, String(value));
            }
          });
        }
        return `/customers/paginated?${search.toString()}`;
      },
      providesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
    getCustomerById: builder.query<Customer, number>({
      query: (id) => `/customers/${id}`,
      providesTags: (_, __, id) => [{ type: 'Customer', id }],
    }),
    createCustomer: builder.mutation<Customer, CreateCustomerRequest>({
      query: (newCustomer) => ({
        url: '/customers/',
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
    exportCustomersExcel: builder.mutation<Blob, Record<string, string | number | undefined> | void>({
      queryFn: async (filters) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const search = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== '') {
                search.append(key, String(value));
              }
            });
          }
          const response = await fetch(`${baseUrl}/customers/export-excel?${search.toString()}`, {
            credentials: 'include',
          });
          if (!response.ok) {
            return { error: { status: response.status, data: 'Не удалось экспортировать клиентов' } };
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
  useGetCustomersQuery,
  useGetCustomersPaginatedQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useExportCustomersExcelMutation,
} = customersApi;