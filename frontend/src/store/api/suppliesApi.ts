import { baseApi } from './baseApi';
import { Supplier } from './suppliersApi';

export interface SupplyItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  cost_price: number;
  unit_price: number;
}

export interface Supply {
  id: number;
  // Поставщик/создатель могут быть удалены (FK ON DELETE SET NULL) — null допустим.
  supplier: Supplier | null;
  warehouse: {
    id: number;
    name: string;
    location: string;
    branch_id: number;
  };
  delivered_at: string;
  created_at: string;
  created_user: {
    id: number;
    full_name: string;
  } | null;
  items: SupplyItem[];
}

export interface SuppliesResponse {
  total: number;
  items: Supply[];
}

export interface SupplyFilters {
  warehouse_id?: number;
  supplier_id?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSupplyItemRequest {
  product_id: number;
  quantity: number;
  cost_price: number;
  unit_price: number;
}

export interface CreateSupplyRequest {
  supplier_id: number;
  warehouse_id: number;
  delivered_at: string;
  items: CreateSupplyItemRequest[];
}

export interface UpdateSupplyRequest {
  supplier_id?: number;
  delivered_at?: string;
  items?: CreateSupplyItemRequest[];
}

// API для поставок
export const suppliesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSupplies: builder.query<SuppliesResponse, SupplyFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        
        if (filters.warehouse_id) {
          params.append('warehouse_id', filters.warehouse_id.toString());
        }
        if (filters.supplier_id) {
          params.append('supplier_id', filters.supplier_id.toString());
        }
        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.date_from) {
          params.append('date_from', filters.date_from);
        }
        if (filters.date_to) {
          params.append('date_to', filters.date_to);
        }
        if (filters.limit) {
          params.append('limit', filters.limit.toString());
        }
        if (filters.offset) {
          params.append('offset', filters.offset.toString());
        }
        
        return `supplies/?${params.toString()}`;
      },
      providesTags: ['Supply'],
      keepUnusedDataFor: 300,
    }),

    // Получить поставку по ID
    getSupplyById: builder.query<Supply, number>({
      query: (id) => `supplies/${id}`,
      providesTags: (_, __, id) => [{ type: 'Supply', id }],
    }),

    createSupply: builder.mutation<Supply, CreateSupplyRequest>({
      query: (supply) => ({
        url: 'supplies/',
        method: 'POST',
        body: supply,
      }),
      invalidatesTags: ['Supply'],
    }),

    updateSupply: builder.mutation<Supply, { id: number; data: UpdateSupplyRequest }>({
      query: ({ id, data }) => ({
        url: `supplies/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Supply', id }, 'Supply'],
    }),

    deleteSupply: builder.mutation<void, number>({
      query: (id) => ({
        url: `supplies/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Supply'],
    }),

    // Скачать PDF накладной
    getSupplyPDF: builder.query<Blob, number>({
      query: (id) => ({
        url: `supplies/${id}/pdf`,
        responseHandler: (response: Response) => response.blob(),
      }),
      keepUnusedDataFor: 0, 
    }),

  }),
});

export const {
  useGetSuppliesQuery,
  useGetSupplyByIdQuery,
  useCreateSupplyMutation,
  useUpdateSupplyMutation,
  useDeleteSupplyMutation,
  useGetSupplyPDFQuery,
} = suppliesApi;