import { z } from 'zod';

export const normalizedProductSchema = z.object({
  product_id: z.number().int().positive(),
  name: z.string(),
  sku: z.string(),
  price: z.number().nonnegative(),
  regular_price: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  on_sale: z.boolean(),
  manage_stock: z.boolean(),
  stock_quantity: z.number().nullable(),
  stock_status: z.enum(['instock', 'outofstock', 'onbackorder']),
  low_stock_amount: z.number().nullable().optional(),
  description: z.string().optional(),
});

export type NormalizedProduct = z.infer<typeof normalizedProductSchema>;

export const searchProductsInputSchema = z.object({
  query: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SearchProductsInput = z.infer<typeof searchProductsInputSchema>;

export const getProductInputSchema = z.object({
  product_id: z.number().int().positive({ message: 'product_id must be a positive integer' }),
});

export type GetProductInput = z.infer<typeof getProductInputSchema>;

export const productsResponseSchema = z.object({
  products: z.array(normalizedProductSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
    has_next_page: z.boolean(),
  }),
});

export type ProductsResponse = z.infer<typeof productsResponseSchema>;
