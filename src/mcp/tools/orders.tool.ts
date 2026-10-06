import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { orderService } from '../../services/order.service.js';

export const searchOrdersTool: Tool = {
  name: 'search_orders',
  description:
    'Search and filter WooCommerce merchant orders by status and date range. Returns compact, normalized order summaries with total amounts, item counts, status, and pagination metadata.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Optional WooCommerce order status filter (e.g., "pending", "processing", "completed", "on-hold", "failed", "cancelled").',
      },
      date_from: {
        type: 'string',
        description: 'Optional inclusive start datetime in ISO 8601 format (e.g., "2026-10-01T00:00:00Z").',
      },
      date_to: {
        type: 'string',
        description: 'Optional inclusive end datetime in ISO 8601 format (e.g., "2026-10-02T23:59:59Z").',
      },
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Page number for pagination.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Maximum number of orders to return (1-100).',
      },
    },
  },
};

export const getOrderTool: Tool = {
  name: 'get_order',
  description:
    'Retrieve complete normalized details for a specific WooCommerce order by its integer ID, including line items, prices, status, and customer notes. Returns NOT_FOUND error if order does not exist.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      order_id: {
        type: 'integer',
        minimum: 1,
        description: 'The unique positive integer ID of the WooCommerce order to retrieve.',
      },
    },
    required: ['order_id'],
  },
};

export async function handleSearchOrders(args: unknown) {
  return orderService.searchOrders(args);
}

export async function handleGetOrder(args: unknown) {
  return orderService.getOrder(args);
}
