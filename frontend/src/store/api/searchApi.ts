import { baseApi } from './baseApi';

export interface CustomerSearchResult {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface OrderSearchResult {
  id: number;
  customer_name: string | null;
  status_name: string | null;
  total_price: number | null;
  created_at: string;
}

export interface ProductSearchResult {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
}

export interface EmployeeSearchResult {
  id: number;
  full_name: string | null;
  email: string;
}

export interface SupplierSearchResult {
  id: number;
  name: string;
  contact_person: string | null;
}

export interface SearchGroup<T> {
  items: T[];
  total: number;
}

export interface GlobalSearchResponse {
  customers?: SearchGroup<CustomerSearchResult>;
  orders?: SearchGroup<OrderSearchResult>;
  products?: SearchGroup<ProductSearchResult>;
  employees?: SearchGroup<EmployeeSearchResult>;
  suppliers?: SearchGroup<SupplierSearchResult>;
}

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    globalSearch: builder.query<GlobalSearchResponse, string>({
      query: (q) => `search?q=${encodeURIComponent(q)}`,
    }),
  }),
});

export const { useGlobalSearchQuery, useLazyGlobalSearchQuery } = searchApi;
