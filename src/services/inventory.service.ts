import { WooCommerceInventoryApi, wooCommerceInventoryApi } from '../wooCommerce/inventory.api.js';
import { RawWooCommerceProduct } from '../wooCommerce/types.js';
import {
  NormalizedInventoryItem,
  GetInventoryInput,
  getInventoryInputSchema,
  InventoryResponse,
} from '../schemas/inventory.schema.js';
import { CartixError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class InventoryService {
  constructor(private inventoryApi: WooCommerceInventoryApi = wooCommerceInventoryApi) {}

  /**
   * Normalizes a raw WooCommerce product into a focused inventory record.
   */
  public normalizeInventoryItem(raw: RawWooCommerceProduct): NormalizedInventoryItem {
    const price = parseFloat(raw.price) || 0;
    const threshold = raw.low_stock_amount !== null && raw.low_stock_amount !== undefined ? raw.low_stock_amount : 5;
    const isLowStock = raw.stock_status === 'outofstock' || (Boolean(raw.manage_stock) && typeof raw.stock_quantity === 'number' && raw.stock_quantity <= threshold);

    return {
      product_id: raw.id,
      name: raw.name,
      sku: raw.sku || `PROD-${raw.id}`,
      price,
      stock_quantity: raw.stock_quantity,
      stock_status: raw.stock_status || 'instock',
      manage_stock: raw.manage_stock || false,
      is_low_stock: isLowStock,
    };
  }

  /**
   * Queries inventory status and optionally filters for low/out-of-stock items.
   */
  async getInventory(rawInput: unknown): Promise<InventoryResponse> {
    const parsed = getInventoryInputSchema.safeParse(rawInput || {});
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new CartixError('INVALID_INPUT', `Invalid get_inventory input: ${issues}`, 400);
    }

    const input: GetInventoryInput = parsed.data;

    logger.info('Retrieving inventory', {
      lowStockOnly: input.low_stock_only,
      page: input.page,
      limit: input.limit,
    });

    const response = await this.inventoryApi.getInventory({
      lowStockOnly: input.low_stock_only,
      page: input.page,
      per_page: input.limit,
    });

    const normalizedItems = response.data.map((p) => this.normalizeInventoryItem(p));

    return {
      inventory: normalizedItems,
      pagination: {
        page: input.page,
        limit: input.limit,
        total: response.total,
        total_pages: response.totalPages,
        has_next_page: input.page < response.totalPages,
      },
    };
  }
}

export const inventoryService = new InventoryService();
