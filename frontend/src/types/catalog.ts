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