import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { inventoryService } from '../../services/inventory.service.js';

export const getInventoryTool: Tool = {
  name: 'get_inventory',
  description:
    'Retrieve inventory levels and stock status for products in the WooCommerce store. Supports filtering for low-stock and out-of-stock items (deterministic low stock threshold <= 5).',
  inputSchema: {
    type: 'object',
    properties: {
      low_stock_only: {
        type: 'boolean',
        default: false,
        description:
          'When true, only returns products that are out of stock or have stock quantity below or equal to their low stock threshold (default threshold: <= 5).',
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
        description: 'Maximum number of inventory items to return (1-100).',
      },
    },
  },
};

export async function handleGetInventory(args: unknown) {
  return inventoryService.getInventory(args);
}
