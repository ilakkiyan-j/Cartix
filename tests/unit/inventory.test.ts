import { describe, it, expect, vi } from 'vitest';
import { InventoryService } from '../../src/services/inventory.service.js';
import { RawWooCommerceProduct } from '../../src/wooCommerce/types.js';

describe('InventoryService', () => {
  const mockProducts: RawWooCommerceProduct[] = [
    {
      id: 1,
      name: 'Standard Mouse',
      slug: 'mouse',
      permalink: '',
      date_created: '',
      date_created_gmt: '',
      date_modified: '',
      date_modified_gmt: '',
      type: 'simple',
      status: 'publish',
      featured: false,
      catalog_visibility: 'visible',
      description: '',
      short_description: '',
      sku: 'MS-001',
      price: '999',
      regular_price: '999',
      sale_price: '',
      on_sale: false,
      purchasable: true,
      total_sales: 0,
      virtual: false,
      downloadable: false,
      manage_stock: true,
      stock_quantity: 40,
      stock_status: 'instock',
      backorders: 'no',
      backorders_allowed: false,
      backordered: false,
      low_stock_amount: 5,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      categories: [],
      tags: [],
      images: [],
    },
    {
      id: 2,
      name: 'Rare Keycap',
      slug: 'rare-keycap',
      permalink: '',
      date_created: '',
      date_created_gmt: '',
      date_modified: '',
      date_modified_gmt: '',
      type: 'simple',
      status: 'publish',
      featured: false,
      catalog_visibility: 'visible',
      description: '',
      short_description: '',
      sku: 'KC-002',
      price: '1499',
      regular_price: '1499',
      sale_price: '',
      on_sale: false,
      purchasable: true,
      total_sales: 0,
      virtual: false,
      downloadable: false,
      manage_stock: true,
      stock_quantity: 2,
      stock_status: 'instock',
      backorders: 'no',
      backorders_allowed: false,
      backordered: false,
      low_stock_amount: 5,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      categories: [],
      tags: [],
      images: [],
    },
    {
      id: 3,
      name: 'Sold Out Desk Mat',
      slug: 'desk-mat',
      permalink: '',
      date_created: '',
      date_created_gmt: '',
      date_modified: '',
      date_modified_gmt: '',
      type: 'simple',
      status: 'publish',
      featured: false,
      catalog_visibility: 'visible',
      description: '',
      short_description: '',
      sku: 'DM-003',
      price: '799',
      regular_price: '799',
      sale_price: '',
      on_sale: false,
      purchasable: true,
      total_sales: 0,
      virtual: false,
      downloadable: false,
      manage_stock: true,
      stock_quantity: 0,
      stock_status: 'outofstock',
      backorders: 'no',
      backorders_allowed: false,
      backordered: false,
      low_stock_amount: null,
      weight: '',
      dimensions: { length: '', width: '', height: '' },
      categories: [],
      tags: [],
      images: [],
    },
  ];

  it('normalizes inventory items and identifies low/out of stock conditions', () => {
    const service = new InventoryService({} as any);

    const item1 = service.normalizeInventoryItem(mockProducts[0]);
    expect(item1.is_low_stock).toBe(false);
    expect(item1.stock_quantity).toBe(40);

    const item2 = service.normalizeInventoryItem(mockProducts[1]);
    expect(item2.is_low_stock).toBe(true);
    expect(item2.stock_quantity).toBe(2);

    const item3 = service.normalizeInventoryItem(mockProducts[2]);
    expect(item3.is_low_stock).toBe(true);
    expect(item3.stock_status).toBe('outofstock');
  });

  it('retrieves inventory with low_stock_only filter', async () => {
    const mockInventoryApi = {
      getInventory: vi.fn().mockResolvedValue({
        data: [mockProducts[1], mockProducts[2]],
        total: 2,
        totalPages: 1,
      }),
    };

    const service = new InventoryService(mockInventoryApi as any);
    const result = await service.getInventory({ low_stock_only: true });

    expect(result.inventory.length).toBe(2);
    expect(result.inventory.every((i) => i.is_low_stock)).toBe(true);
    expect(mockInventoryApi.getInventory).toHaveBeenCalledWith({
      lowStockOnly: true,
      page: 1,
      per_page: 20,
    });
  });

  it('rejects invalid limit exceeding 100 with INVALID_INPUT error', async () => {
    const service = new InventoryService({} as any);

    await expect(service.getInventory({ limit: 150 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
    });
  });
});
