export interface Product {
  id: number;
  name: string;
  description: string;
  detail: string;
  cost_price: number;
  price: number;
  in_stock: boolean;
  category_id: number;
  subcategory_id: number;
  brand_id: number;
}

export interface Brand {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  products_count: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  products_count: number;
  subcategories_count: number;
}

export interface Subcategory {
  id: number;
  name: string;
  category_id: number;
  is_active: boolean;
  created_at: string;
  products_count: number;
}

export interface ProductFilters {
  search: string;
  category_id: string;
  subcategory_id: string;
  brand_id: string;
  in_stock: string;
  price_min: string;
  price_max: string;
}

export interface CategoryFilters {
  search: string;
}

export type CatalogSortOrder = 'asc' | 'desc';

export interface CatalogPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BulkActionSkipped {
  id: number;
  reason: string;
}

export interface BulkActionResult {
  deleted: number[];
  skipped: BulkActionSkipped[];
}

export interface BulkStatusResult {
  updated: number;
}