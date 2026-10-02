import { describe, it, expect, vi } from 'vitest';
import { OrderService } from '../../src/services/order.service.js';
import { RawWooCommerceOrder } from '../../src/wooCommerce/types.js';

describe('OrderService', () => {
  const mockRawOrder: RawWooCommerceOrder = {
    id: 1004,
    parent_id: 0,
    number: '1004',
    order_key: 'wc_order_abc123',
    created_via: 'checkout',
    version: '8.5.0',
    status: 'pending',
    currency: 'INR',
    date_created: '2026-10-01T08:20:00',
    date_created_gmt: '2026-10-01T08:20:00',
    date_modified: '2026-10-01T08:20:00',
    date_modified_gmt: '2026-10-01T08:20:00',
    discount_total: '0.00',
    discount_tax: '0.00',
    shipping_total: '0.00',
    shipping_tax: '0.00',
    cart_tax: '0.00',
    total: '2499.00',
    total_tax: '0.00',
    prices_include_tax: false,
    customer_id: 42,
    customer_ip_address: '127.0.0.1',
    customer_user_agent: 'Mozilla/5.0',
    customer_note: 'Please leave package at front door',
    billing: {
      first_name: 'Jane',
      last_name: 'Doe',
      company: '',
      address_1: '123 Main St',
      address_2: '',
      city: 'Bengaluru',
      state: 'KA',
      postcode: '560001',
      country: 'IN',
      email: 'jane@example.com',
      phone: '+919999999999',
    },
    shipping: {
      first_name: 'Jane',
      last_name: 'Doe',
      company: '',
      address_1: '123 Main St',
      address_2: '',
      city: 'Bengaluru',
      state: 'KA',
      postcode: '560001',
      country: 'IN',
    },
    payment_method: 'bacs',
    payment_method_title: 'Direct Bank Transfer',
    transaction_id: '',
    line_items: [
      {
        id: 1,
        name: 'Wireless Mechanical Keyboard',
        product_id: 87,
        variation_id: 0,
        quantity: 2,
        tax_class: '',
        subtotal: '2499.00',
        subtotal_tax: '0.00',
        total: '2499.00',
        total_tax: '0.00',
        sku: 'KB-001',
        price: 1249.5,
      },
    ],
  };

  it('normalizes raw orders into compact agent schemas without sensitive PII', () => {
    const service = new OrderService({} as any);
    const normalized = service.normalizeOrder(mockRawOrder);

    expect(normalized.order_id).toBe(1004);
    expect(normalized.status).toBe('pending');
    expect(normalized.created_at).toBe('2026-10-01T08:20:00Z');
    expect(normalized.currency).toBe('INR');
    expect(normalized.total).toBe(2499);
    expect(normalized.item_count).toBe(2);
    expect(normalized.customer_note).toBe('Please leave package at front door');

    // Verify PII is stripped
    expect((normalized as any).billing).toBeUndefined();
    expect((normalized as any).shipping).toBeUndefined();
    expect((normalized as any).customer_ip_address).toBeUndefined();
  });

  it('searches orders and produces bounded pagination', async () => {
    const mockOrdersApi = {
      listOrders: vi.fn().mockResolvedValue({
        data: [mockRawOrder],
        total: 50,
        totalPages: 3,
      }),
      getOrder: vi.fn(),
    };

    const service = new OrderService(mockOrdersApi as any);
    const result = await service.searchOrders({
      status: 'pending',
      page: 1,
      limit: 20,
    });

    expect(result.orders.length).toBe(1);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 50,
      total_pages: 3,
      has_next_page: true,
    });
    expect(mockOrdersApi.listOrders).toHaveBeenCalledWith({
      status: 'pending',
      after: undefined,
      before: undefined,
      page: 1,
      per_page: 20,
    });
  });

  it('rejects invalid inputs with INVALID_INPUT error', async () => {
    const service = new OrderService({} as any);

    await expect(service.searchOrders({ page: -1 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
    });

    await expect(service.getOrder({ order_id: -5 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
    });
  });
});
