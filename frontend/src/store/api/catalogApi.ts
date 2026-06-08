import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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

export interface Brand {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Subcategory {
  id: number;
  name: string;
  category_id: number;
}

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
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

export interface CreateSubcategoryRequest {
  name: string;
  category_id: number;
}

export interface UpdateSubcategoryRequest {
  name?: string;
  category_id?: number;
}

export interface ImportCsvResult {
  created: number;
  updated: number;
  errors: string[];
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
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useGetSubcategoriesQuery,
  useCreateSubcategoryMutation,
  useUpdateSubcategoryMutation,
  useDeleteSubcategoryMutation,
  useImportProductsCsvMutation,
} = catalogApi;