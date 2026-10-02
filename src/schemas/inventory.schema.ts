import { z } from 'zod';

export const normalizedInventoryItemSchema = z.object({
  product_id: z.number().int().positive(),
  name: z.string(),
  sku: z.string(),
  price: z.number().nonnegative(),
  stock_quantity: z.number().nullable(),
  stock_status: z.enum(['instock', 'outofstock', 'onbackorder']),
  manage_stock: z.boolean(),
  is_low_stock: z.boolean(),
});

export type NormalizedInventoryItem = z.infer<typeof normalizedInventoryItemSchema>;

export const getInventoryInputSchema = z.object({
  low_stock_only: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type GetInventoryInput = z.infer<typeof getInventoryInputSchema>;

export const inventoryResponseSchema = z.object({
  inventory: z.array(normalizedInventoryItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
    has_next_page: z.boolean(),
  }),
});

export type InventoryResponse = z.infer<typeof inventoryResponseSchema>;
