import { z } from 'zod';

export const orderLineItemSchema = z.object({
  product_id: z.number().int().positive(),
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  total: z.number().nonnegative(),
  sku: z.string().optional(),
});

export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

export const normalizedOrderSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.string(),
  created_at: z.string(),
  currency: z.string(),
  total: z.number().nonnegative(),
  item_count: z.number().int().nonnegative(),
  line_items: z.array(orderLineItemSchema),
  customer_note: z.string().optional(),
});

export type NormalizedOrder = z.infer<typeof normalizedOrderSchema>;

export const searchOrdersInputSchema = z.object({
  status: z.string().optional(),
  date_from: z.string().datetime({ message: 'date_from must be a valid ISO 8601 datetime string' }).optional(),
  date_to: z.string().datetime({ message: 'date_to must be a valid ISO 8601 datetime string' }).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SearchOrdersInput = z.infer<typeof searchOrdersInputSchema>;

export const getOrderInputSchema = z.object({
  order_id: z.number().int().positive({ message: 'order_id must be a positive integer' }),
});

export type GetOrderInput = z.infer<typeof getOrderInputSchema>;

export const ordersResponseSchema = z.object({
  orders: z.array(normalizedOrderSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
    has_next_page: z.boolean(),
  }),
});

export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
