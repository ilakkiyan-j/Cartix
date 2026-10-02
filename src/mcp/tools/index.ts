import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { searchOrdersTool, getOrderTool, handleSearchOrders, handleGetOrder } from './orders.tool.js';
import { searchProductsTool, getProductTool, handleSearchProducts, handleGetProduct } from './products.tool.js';
import { getInventoryTool, handleGetInventory } from './inventory.tool.js';

export const CARTIX_TOOLS: Tool[] = [
  searchOrdersTool,
  getOrderTool,
  searchProductsTool,
  getProductTool,
  getInventoryTool,
];

export type ToolHandler = (args: unknown) => Promise<unknown>;

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  search_orders: handleSearchOrders,
  get_order: handleGetOrder,
  search_products: handleSearchProducts,
  get_product: handleGetProduct,
  get_inventory: handleGetInventory,
};
