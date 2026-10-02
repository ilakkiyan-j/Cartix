import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { productService } from '../../services/product.service.js';

export const searchProductsTool: Tool = {
  name: 'search_products',
  description:
    'Search the WooCommerce product catalog by text query or SKU. Returns normalized products including pricing, stock quantity, stock status, and pagination metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Optional search keyword or text to match against product titles, descriptions, or SKUs.',
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
        description: 'Maximum number of products to return (1-100).',
      },
    },
  },
};

export const getProductTool: Tool = {
  name: 'get_product',
  description:
    'Retrieve full normalized details for a specific WooCommerce product by its integer ID, including SKU, price, sale price, stock quantity, and stock status. Returns NOT_FOUND if product does not exist.',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'integer',
        minimum: 1,
        description: 'The unique positive integer ID of the WooCommerce product to retrieve.',
      },
    },
    required: ['product_id'],
  },
};

export async function handleSearchProducts(args: unknown) {
  return productService.searchProducts(args);
}

export async function handleGetProduct(args: unknown) {
  return productService.getProduct(args);
}
