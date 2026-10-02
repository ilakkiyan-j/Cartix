import { WooCommerceProductsApi, wooCommerceProductsApi } from '../wooCommerce/products.api.js';
import { RawWooCommerceProduct } from '../wooCommerce/types.js';
import {
  NormalizedProduct,
  SearchProductsInput,
  searchProductsInputSchema,
  ProductsResponse,
  GetProductInput,
  getProductInputSchema,
} from '../schemas/product.schema.js';
import { CartixError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class ProductService {
  constructor(private productsApi: WooCommerceProductsApi = wooCommerceProductsApi) {}

  /**
   * Normalizes a raw WooCommerce product into a compact, secure object for AI consumption.
   */
  public normalizeProduct(raw: RawWooCommerceProduct): NormalizedProduct {
    const price = parseFloat(raw.price) || 0;
    const regularPrice = raw.regular_price ? parseFloat(raw.regular_price) : undefined;
    const salePrice = raw.sale_price ? parseFloat(raw.sale_price) : undefined;

    return {
      product_id: raw.id,
      name: raw.name,
      sku: raw.sku || `PROD-${raw.id}`,
      price,
      regular_price: regularPrice,
      sale_price: salePrice,
      on_sale: raw.on_sale || false,
      manage_stock: raw.manage_stock || false,
      stock_quantity: raw.stock_quantity,
      stock_status: raw.stock_status || 'instock',
      low_stock_amount: raw.low_stock_amount,
      description: raw.short_description ? raw.short_description.replace(/<[^>]*>?/gm, '').trim() : undefined,
    };
  }

  /**
   * Searches and retrieves products by keyword.
   */
  async searchProducts(rawInput: unknown): Promise<ProductsResponse> {
    const parsed = searchProductsInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new CartixError('INVALID_INPUT', `Invalid search_products input: ${issues}`, 400);
    }

    const input: SearchProductsInput = parsed.data;

    logger.info('Searching products', { query: input.query, page: input.page, limit: input.limit });

    const queryParams = {
      search: input.query,
      page: input.page,
      per_page: input.limit,
    };

    const response = await this.productsApi.listProducts(queryParams);
    const normalizedProducts = response.data.map((p) => this.normalizeProduct(p));

    return {
      products: normalizedProducts,
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
   * Retrieves a single product by integer ID.
   */
  async getProduct(rawInput: unknown): Promise<NormalizedProduct> {
    const parsed = getProductInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new CartixError('INVALID_INPUT', `Invalid get_product input: ${issues}`, 400);
    }

    const input: GetProductInput = parsed.data;

    logger.info('Retrieving product', { productId: input.product_id });

    const rawProduct = await this.productsApi.getProduct(input.product_id);
    return this.normalizeProduct(rawProduct);
  }
}

export const productService = new ProductService();
