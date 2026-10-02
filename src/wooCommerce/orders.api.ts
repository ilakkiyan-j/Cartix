import { WooCommerceClient, wooCommerceClient } from './client.js';
import { RawWooCommerceOrder, WooCommerceOrderQueryParams, WooCommerceApiResponse } from './types.js';

export class WooCommerceOrdersApi {
  constructor(private client: WooCommerceClient = wooCommerceClient) {}

  /**
   * Fetches a list of orders with optional query filtering and pagination.
   */
  async listOrders(params: WooCommerceOrderQueryParams = {}): Promise<WooCommerceApiResponse<RawWooCommerceOrder[]>> {
    return this.client.request<RawWooCommerceOrder[]>({
      url: '/orders',
      method: 'GET',
      params,
    });
  }

  /**
   * Fetches a single order by its integer ID.
   */
  async getOrder(orderId: number): Promise<RawWooCommerceOrder> {
    const response = await this.client.request<RawWooCommerceOrder>({
      url: `/orders/${orderId}`,
      method: 'GET',
    });
    return response.data;
  }
}

export const wooCommerceOrdersApi = new WooCommerceOrdersApi();
