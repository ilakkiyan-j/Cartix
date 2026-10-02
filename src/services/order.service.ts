import { WooCommerceOrdersApi, wooCommerceOrdersApi } from '../wooCommerce/orders.api.js';
import { RawWooCommerceOrder, RawWooCommerceLineItem } from '../wooCommerce/types.js';
import {
  NormalizedOrder,
  OrderLineItem,
  SearchOrdersInput,
  searchOrdersInputSchema,
  OrdersResponse,
  GetOrderInput,
  getOrderInputSchema,
} from '../schemas/order.schema.js';
import { CartixError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class OrderService {
  constructor(private ordersApi: WooCommerceOrdersApi = wooCommerceOrdersApi) {}

  /**
   * Normalizes a raw WooCommerce order into a compact, secure object for AI consumption.
   */
  public normalizeOrder(raw: RawWooCommerceOrder): NormalizedOrder {
    const lineItems: OrderLineItem[] = (raw.line_items || []).map((item: RawWooCommerceLineItem) => ({
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price ? String(item.price) : (parseFloat(item.subtotal) / (item.quantity || 1)).toFixed(2)) || 0,
      total: parseFloat(item.total) || 0,
      sku: item.sku || undefined,
    }));

    const itemCount = lineItems.reduce((acc, cur) => acc + cur.quantity, 0);
    const parsedTotal = parseFloat(raw.total) || 0;

    return {
      order_id: raw.id,
      status: raw.status,
      created_at: raw.date_created_gmt ? `${raw.date_created_gmt}Z` : raw.date_created,
      currency: raw.currency || 'INR',
      total: parsedTotal,
      item_count: itemCount,
      line_items: lineItems,
      customer_note: raw.customer_note || undefined,
    };
  }

  /**
   * Searches and filters merchant orders.
   */
  async searchOrders(rawInput: unknown): Promise<OrdersResponse> {
    const parsed = searchOrdersInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new CartixError('INVALID_INPUT', `Invalid search_orders input: ${issues}`, 400);
    }

    const input: SearchOrdersInput = parsed.data;

    logger.info('Searching orders', {
      status: input.status,
      date_from: input.date_from,
      date_to: input.date_to,
      page: input.page,
      limit: input.limit,
    });

    const queryParams = {
      status: input.status,
      after: input.date_from,
      before: input.date_to,
      page: input.page,
      per_page: input.limit,
    };

    const response = await this.ordersApi.listOrders(queryParams);
    const normalizedOrders = response.data.map((order) => this.normalizeOrder(order));

    return {
      orders: normalizedOrders,
      pagination: {
        page: input.page,
        limit: input.limit,
        total: response.total,
        total_pages: response.totalPages,
        has_next_page: input.page < response.totalPages,
      },
    };
  }

  /**
   * Retrieves a single order by integer ID.
   */
  async getOrder(rawInput: unknown): Promise<NormalizedOrder> {
    const parsed = getOrderInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new CartixError('INVALID_INPUT', `Invalid get_order input: ${issues}`, 400);
    }

    const input: GetOrderInput = parsed.data;

    logger.info('Retrieving order', { orderId: input.order_id });

    const rawOrder = await this.ordersApi.getOrder(input.order_id);
    return this.normalizeOrder(rawOrder);
  }
}

export const orderService = new OrderService();
