import { WooCommerceClient, wooCommerceClient } from './client.js';
import { RawWooCommerceProduct, WooCommerceProductQueryParams, WooCommerceApiResponse } from './types.js';

export class WooCommerceProductsApi {
  constructor(private client: WooCommerceClient = wooCommerceClient) {}

  /**
   * Fetches a list of products with optional search query and pagination.
   */
  async listProducts(params: WooCommerceProductQueryParams = {}): Promise<WooCommerceApiResponse<RawWooCommerceProduct[]>> {
    return this.client.request<RawWooCommerceProduct[]>({
      url: '/products',
      method: 'GET',
      params,
    });
  }

  /**
   * Fetches a single product by its integer ID.
   */
  async getProduct(productId: number): Promise<RawWooCommerceProduct> {
    const response = await this.client.request<RawWooCommerceProduct>({
      url: `/products/${productId}`,
      method: 'GET',
    });
    return response.data;
  }
}

export const wooCommerceProductsApi = new WooCommerceProductsApi();
