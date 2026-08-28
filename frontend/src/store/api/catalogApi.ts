import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Category as CategoryFull,
  Subcategory as SubcategoryFull,
  Brand as BrandFull,
  CatalogPage,
  CatalogSortOrder,
  BulkActionResult,
  BulkStatusResult,
} from '../../types/catalog';

export interface Product {
  id: number;
  name: string;
  description: string;
  detail: string;
  cost_price: number;
  price: number;
  category_id: number;
  subcategory_id: number;
  brand_id: number;
  sku: string;                   
  barcode: string;            
  qr_code: string;              
  available_quantity: number;  
}

// Re-exported so existing `import { Category } from '.../catalogApi'`-style code keeps working;
// the canonical definitions (including is_active/created_at/products_count) live in types/catalog.ts.
export type Brand = BrandFull;
export type Category = CategoryFull;
export type Subcategory = SubcategoryFull;

export interface CreateProductRequest {
  name: string;
  description: string;
  detail: string;
  cost_price: number;
  price: number;
  category_id: number;
  subcategory_id: number;
  brand_id: number;
  sku?: string;       
  barcode?: string;  
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  detail?: string;
  cost_price?: number;
  price?: number;
  brand_id?: number;            
  subcategory_id?: number;
  sku?: string;                 
  barcode?: string;            
}

export interface CreateBrandRequest {
  name: string;
}

export interface UpdateBrandRequest {
  name?: string;
  is_active?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateSubcategoryRequest {
  name: string;
  category_id: number;
}

export interface UpdateSubcategoryRequest {
  name?: string;
  category_id?: number;
  is_active?: boolean;
}

export interface ImportCsvResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface ImportPreviewRow {
  row: number;
  sku: string | null;
  name: string | null;
  action: 'create' | 'update' | 'error';
  errors: string[];
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  summary: { to_create: number; to_update: number; errors: number };
}

export interface ExcelImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface CatalogPaginationParams {
  search?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: CatalogSortOrder;
  page?: number;
  page_size?: number;
}

export interface SubcategoryPaginationParams extends CatalogPaginationParams {
  category_id?: number;
}

export interface BulkIdsRequest {
  ids: number[];
  force?: boolean;
}

export interface BulkStatusRequest {
  ids: number[];
  is_active: boolean;
}

function buildQueryString(params?: Record<string, unknown>): string {
  const search = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.append(key, String(value));
      }
    });
  }
  return search.toString();
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProductFilters extends PaginationParams {
  name?: string;             
  sku?: string;            
  barcode?: string;         
  brand_id?: number;
  category_id?: number;
  subcategory_id?: number;
  min_price?: number;      
  max_price?: number;       
  min_cost_price?: number;   
  max_cost_price?: number;  
}

export const catalogApi = createApi({
  reducerPath: 'catalogApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    credentials: 'include', // Используем cookies вместо токенов
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Product', 'Category', 'Brand', 'Subcategory'],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], ProductFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        
        if (filters && typeof filters === 'object') {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              params.append(key, value.toString());
            }
          });
        }
        
        return `products/?${params.toString()}`;
      },
      providesTags: ['Product'],
    }),

    getProduct: builder.query<Product, number>({
      query: (id) => `products/${id}/`,
      providesTags: (_, __, id) => [{ type: 'Product', id }],
    }),

    createProduct: builder.mutation<Product, CreateProductRequest>({
      query: (product) => ({
        url: 'products/',
        method: 'POST',
        body: product,
      }),
      invalidatesTags: ['Product'],
    }),

    updateProduct: builder.mutation<Product, { id: number; data: UpdateProductRequest }>({
      query: ({ id, data }) => ({
        url: `products/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Product', id }, 'Product'],
    }),

    deleteProduct: builder.mutation<void, number>({
      query: (id) => ({
        url: `products/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),

    getProductQRCode: builder.query<Blob, number>({
      query: (id) => ({
        url: `products/${id}/qr`,
        responseHandler: (response) => response.blob(),
      }),
      providesTags: (_, __, id) => [{ type: 'Product', id: `${id}-qr` }],
    }),

    downloadProductQRCode: builder.mutation<Blob, number>({
      query: (id) => ({
        url: `products/${id}/qr/download`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),

    getCategories: builder.query<Category[], void>({
      query: () => 'categories/',
      providesTags: ['Category'],
      keepUnusedDataFor: 300, // 5 минут
    }),

    createCategory: builder.mutation<Category, CreateCategoryRequest>({
      query: (category) => ({
        url: 'categories/',
        method: 'POST',
        body: category,
      }),
      invalidatesTags: ['Category'],
    }),

    updateCategory: builder.mutation<Category, { id: number; data: UpdateCategoryRequest }>({
      query: ({ id, data }) => ({
        url: `categories/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),

    deleteCategory: builder.mutation<void, number>({
      query: (id) => ({
        url: `categories/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),

    getCategoriesPaginated: builder.query<CatalogPage<CategoryFull>, CatalogPaginationParams | void>({
      query: (params) => `categories/paginated?${buildQueryString(params as Record<string, unknown>)}`,
      providesTags: ['Category'],
    }),

    bulkDeleteCategories: builder.mutation<BulkActionResult, BulkIdsRequest>({
      query: (body) => ({ url: 'categories/bulk-delete', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),

    bulkSetCategoriesStatus: builder.mutation<BulkStatusResult, BulkStatusRequest>({
      query: (body) => ({ url: 'categories/bulk-status', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),

    getBrands: builder.query<Brand[], void>({
      query: () => 'brands/',
      providesTags: ['Brand'],
      keepUnusedDataFor: 300,
    }),

    createBrand: builder.mutation<Brand, CreateBrandRequest>({
      query: (brand) => ({
        url: 'brands/',
        method: 'POST',
        body: brand,
      }),
      invalidatesTags: ['Brand'],
    }),

    updateBrand: builder.mutation<Brand, { id: number; data: UpdateBrandRequest }>({
      query: ({ id, data }) => ({
        url: `brands/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Brand'],
    }),

    deleteBrand: builder.mutation<void, number>({
      query: (id) => ({
        url: `brands/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Brand'],
    }),

    getBrandsPaginated: builder.query<CatalogPage<BrandFull>, CatalogPaginationParams | void>({
      query: (params) => `brands/paginated?${buildQueryString(params as Record<string, unknown>)}`,
      providesTags: ['Brand'],
    }),

    bulkDeleteBrands: builder.mutation<BulkActionResult, BulkIdsRequest>({
      query: (body) => ({ url: 'brands/bulk-delete', method: 'POST', body }),
      invalidatesTags: ['Brand'],
    }),

    bulkSetBrandsStatus: builder.mutation<BulkStatusResult, BulkStatusRequest>({
      query: (body) => ({ url: 'brands/bulk-status', method: 'POST', body }),
      invalidatesTags: ['Brand'],
    }),

    getSubcategories: builder.query<Subcategory[], void>({
      query: () => 'subcategories/',
      providesTags: ['Subcategory'],
      keepUnusedDataFor: 300,
    }),

    createSubcategory: builder.mutation<Subcategory, CreateSubcategoryRequest>({
      query: (subcategory) => ({
        url: 'subcategories/',
        method: 'POST',
        body: subcategory,
      }),
      invalidatesTags: ['Subcategory'],
    }),

    updateSubcategory: builder.mutation<Subcategory, { id: number; data: UpdateSubcategoryRequest }>({
      query: ({ id, data }) => ({
        url: `subcategories/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Subcategory'],
    }),

    deleteSubcategory: builder.mutation<void, number>({
      query: (id) => ({
        url: `subcategories/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subcategory'],
    }),

    getSubcategoriesPaginated: builder.query<CatalogPage<SubcategoryFull>, SubcategoryPaginationParams | void>({
      query: (params) => `subcategories/paginated?${buildQueryString(params as Record<string, unknown>)}`,
      providesTags: ['Subcategory'],
    }),

    bulkDeleteSubcategories: builder.mutation<BulkActionResult, BulkIdsRequest>({
      query: (body) => ({ url: 'subcategories/bulk-delete', method: 'POST', body }),
      invalidatesTags: ['Subcategory'],
    }),

    bulkSetSubcategoriesStatus: builder.mutation<BulkStatusResult, BulkStatusRequest>({
      query: (body) => ({ url: 'subcategories/bulk-status', method: 'POST', body }),
      invalidatesTags: ['Subcategory'],
    }),

    importProductsCsv: builder.mutation<ImportCsvResult, FormData>({
      queryFn: async (formData) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${baseUrl}/products/import-csv`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Ошибка загрузки' }));
            return { error: { status: response.status, data: err } };
          }
          const data: ImportCsvResult = await response.json();
          return { data };
        } catch (e) {
          return { error: { status: 'FETCH_ERROR', error: String(e) } };
        }
      },
      invalidatesTags: ['Product'],
    }),

    downloadImportTemplate: builder.mutation<Blob, void>({
      queryFn: async () => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${baseUrl}/products/import-template`, {
            credentials: 'include',
          });
          if (!response.ok) {
            return { error: { status: response.status, data: 'Не удалось скачать шаблон' } };
          }
          return { data: await response.blob() };
        } catch (e) {
          return { error: { status: 'FETCH_ERROR', error: String(e) } };
        }
      },
    }),

    exportProductsExcel: builder.mutation<Blob, Record<string, string | number | undefined> | void>({
      queryFn: async (filters) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const qs = buildQueryString(filters as Record<string, unknown>);
          const response = await fetch(`${baseUrl}/products/export-excel?${qs}`, {
            credentials: 'include',
          });
          if (!response.ok) {
            return { error: { status: response.status, data: 'Не удалось экспортировать товары' } };
          }
          return { data: await response.blob() };
        } catch (e) {
          return { error: { status: 'FETCH_ERROR', error: String(e) } };
        }
      },
    }),

    previewImportExcel: builder.mutation<ImportPreviewResult, FormData>({
      queryFn: async (formData) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${baseUrl}/products/import-excel/preview`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Ошибка предпросмотра импорта' }));
            return { error: { status: response.status, data: err } };
          }
          const data: ImportPreviewResult = await response.json();
          return { data };
        } catch (e) {
          return { error: { status: 'FETCH_ERROR', error: String(e) } };
        }
      },
    }),

    importExcel: builder.mutation<ExcelImportResult, FormData>({
      queryFn: async (formData) => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${baseUrl}/products/import-excel`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Ошибка импорта' }));
            return { error: { status: response.status, data: err } };
          }
          const data: ExcelImportResult = await response.json();
          return { data };
        } catch (e) {
          return { error: { status: 'FETCH_ERROR', error: String(e) } };
        }
      },
      invalidatesTags: ['Product'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetProductQRCodeQuery,
  useDownloadProductQRCodeMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesPaginatedQuery,
  useBulkDeleteCategoriesMutation,
  useBulkSetCategoriesStatusMutation,
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useGetBrandsPaginatedQuery,
  useBulkDeleteBrandsMutation,
  useBulkSetBrandsStatusMutation,
  useGetSubcategoriesQuery,
  useCreateSubcategoryMutation,
  useUpdateSubcategoryMutation,
  useDeleteSubcategoryMutation,
  useGetSubcategoriesPaginatedQuery,
  useBulkDeleteSubcategoriesMutation,
  useBulkSetSubcategoriesStatusMutation,
  useImportProductsCsvMutation,
  useDownloadImportTemplateMutation,
  useExportProductsExcelMutation,
  usePreviewImportExcelMutation,
  useImportExcelMutation,
} = catalogApi;