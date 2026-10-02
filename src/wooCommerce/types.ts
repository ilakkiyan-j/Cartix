export interface WooCommercePaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  order?: 'asc' | 'desc';
  orderby?: 'date' | 'id' | 'include' | 'title' | 'slug' | 'price' | 'popularity' | 'rating';
}

export interface WooCommerceOrderQueryParams extends WooCommercePaginationParams {
  status?: string; // 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed' | 'any'
  after?: string; // ISO 8601 string
  before?: string; // ISO 8601 string
  customer?: number;
  product?: number;
}

export interface WooCommerceProductQueryParams extends WooCommercePaginationParams {
  category?: string;
  tag?: string;
  sku?: string;
  status?: 'any' | 'draft' | 'pending' | 'private' | 'publish';
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  min_price?: string;
  max_price?: string;
}

export interface RawWooCommerceLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  sku?: string;
  price?: number;
}

export interface RawWooCommerceOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid?: string;
  date_paid_gmt?: string;
  date_completed?: string;
  date_completed_gmt?: string;
  line_items: RawWooCommerceLineItem[];
}

export interface RawWooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  low_stock_amount: number | null;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; name: string; alt: string }>;
}

export interface WooCommerceApiResponse<T> {
  data: T;
  total: number;
  totalPages: number;
}
