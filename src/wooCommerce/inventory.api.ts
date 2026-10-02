import { WooCommerceClient, wooCommerceClient } from './client.js';
import { RawWooCommerceProduct, WooCommerceProductQueryParams, WooCommerceApiResponse } from './types.js';

export interface InventoryQueryParams extends WooCommerceProductQueryParams {
  lowStockOnly?: boolean;
}

export class WooCommerceInventoryApi {
  constructor(private client: WooCommerceClient = wooCommerceClient) {}

  /**
   * Fetches product inventory. If lowStockOnly is requested, filters for items
   * that are either 'outofstock' or have managed stock quantity <= low_stock_amount (defaulting to <= 5 if not set).
   */
  async getInventory(params: InventoryQueryParams = {}): Promise<WooCommerceApiResponse<RawWooCommerceProduct[]>> {
    const { lowStockOnly, ...productParams } = params;

    const response = await this.client.request<RawWooCommerceProduct[]>({
      url: '/products',
      method: 'GET',
      params: {
        ...productParams,
        // When lowStockOnly is requested, retrieve publish products
        status: 'publish',
      },
    });

    if (!lowStockOnly) {
      return response;
    }

    // Filter products locally according to deterministic low-stock definition
    const filteredProducts = response.data.filter((product) => {
      // If out of stock, it qualifies
      if (product.stock_status === 'outofstock') {
        return true;
      }
      // If managing stock and quantity is known
      if (product.manage_stock && typeof product.stock_quantity === 'number') {
        const threshold = product.low_stock_amount !== null && product.low_stock_amount !== undefined
          ? product.low_stock_amount
          : 5;
        return product.stock_quantity <= threshold;
      }
      return false;
    });

    return {
      data: filteredProducts,
      total: filteredProducts.length,
      totalPages: 1,
    };
  }
}

export const wooCommerceInventoryApi = new WooCommerceInventoryApi();
