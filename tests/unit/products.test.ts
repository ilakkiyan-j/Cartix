import { describe, it, expect, vi } from 'vitest';
import { ProductService } from '../../src/services/product.service.js';
import { RawWooCommerceProduct } from '../../src/wooCommerce/types.js';

describe('ProductService', () => {
  const mockRawProduct: RawWooCommerceProduct = {
    id: 87,
    name: 'Mechanical Keyboard',
    slug: 'mechanical-keyboard',
    permalink: 'https://store.example.com/product/mechanical-keyboard',
    date_created: '2026-10-01T00:00:00',
    date_created_gmt: '2026-10-01T00:00:00',
    date_modified: '2026-10-01T00:00:00',
    date_modified_gmt: '2026-10-01T00:00:00',
    type: 'simple',
    status: 'publish',
    featured: false,
    catalog_visibility: 'visible',
    description: '<p>Long description</p>',
    short_description: '<p>Tactile switch RGB keyboard.</p>',
    sku: 'KB-001',
    price: '4999',
    regular_price: '5499',
    sale_price: '4999',
    on_sale: true,
    purchasable: true,
    total_sales: 12,
    virtual: false,
    downloadable: false,
    manage_stock: true,
    stock_quantity: 15,
    stock_status: 'instock',
    backorders: 'no',
    backorders_allowed: false,
    backordered: false,
    low_stock_amount: 5,
    weight: '1.2',
    dimensions: { length: '35', width: '15', height: '4' },
    categories: [],
    tags: [],
    images: [],
  };

  it('normalizes raw product into clean agent schema with stripped HTML', () => {
    const service = new ProductService({} as any);
    const normalized = service.normalizeProduct(mockRawProduct);

    expect(normalized.product_id).toBe(87);
    expect(normalized.name).toBe('Mechanical Keyboard');
    expect(normalized.sku).toBe('KB-001');
    expect(normalized.price).toBe(4999);
    expect(normalized.regular_price).toBe(5499);
    expect(normalized.sale_price).toBe(4999);
    expect(normalized.on_sale).toBe(true);
    expect(normalized.manage_stock).toBe(true);
    expect(normalized.stock_quantity).toBe(15);
    expect(normalized.stock_status).toBe('instock');
    expect(normalized.description).toBe('Tactile switch RGB keyboard.');
  });

  it('searches products with pagination', async () => {
    const mockProductsApi = {
      listProducts: vi.fn().mockResolvedValue({
        data: [mockRawProduct],
        total: 1,
        totalPages: 1,
      }),
      getProduct: vi.fn(),
    };

    const service = new ProductService(mockProductsApi as any);
    const result = await service.searchProducts({ query: 'keyboard', page: 1, limit: 10 });

    expect(result.products.length).toBe(1);
    expect(result.products[0].name).toBe('Mechanical Keyboard');
    expect(result.pagination.total).toBe(1);
    expect(mockProductsApi.listProducts).toHaveBeenCalledWith({
      search: 'keyboard',
      page: 1,
      per_page: 10,
    });
  });

  it('retrieves single product by positive integer ID', async () => {
    const mockProductsApi = {
      listProducts: vi.fn(),
      getProduct: vi.fn().mockResolvedValue(mockRawProduct),
    };

    const service = new ProductService(mockProductsApi as any);
    const result = await service.getProduct({ product_id: 87 });

    expect(result.product_id).toBe(87);
    expect(mockProductsApi.getProduct).toHaveBeenCalledWith(87);
  });

  it('rejects invalid product queries with INVALID_INPUT error', async () => {
    const service = new ProductService({} as any);

    await expect(service.getProduct({ product_id: 0 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
    });
  });
});
