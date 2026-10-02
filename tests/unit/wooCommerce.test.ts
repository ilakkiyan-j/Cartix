import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { WooCommerceClient } from '../../src/wooCommerce/client.js';
import { WooCommerceOrdersApi } from '../../src/wooCommerce/orders.api.js';
import { WooCommerceProductsApi } from '../../src/wooCommerce/products.api.js';
import { WooCommerceInventoryApi } from '../../src/wooCommerce/inventory.api.js';
import { CartixError } from '../../src/utils/errors.js';

describe('WooCommerceClient & API Modules', () => {
  let mockAxiosInstance: any;
  const noRetryOptions = { maxRetries: 0, baseDelayMs: 0, sleepFn: async () => {} };

  beforeEach(() => {
    mockAxiosInstance = {
      defaults: { timeout: 5000 },
      request: vi.fn(),
    };
    vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance);
  });

  describe('WooCommerceClient initialization', () => {
    it('throws CartixError if URL is missing', () => {
      expect(() => {
        new WooCommerceClient({ url: '' } as any);
      }).toThrow(/WOOCOMMERCE_URL is not configured/);
    });

    it('configures Basic Auth header correctly', () => {
      new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test_123',
        consumerSecret: 'cs_test_456',
      });

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://store.example.com/wp-json/wc/v3',
          headers: expect.objectContaining({
            Authorization: `Basic ${Buffer.from('ck_test_123:cs_test_456').toString('base64')}`,
            Accept: 'application/json',
          }),
        })
      );
    });
  });

  describe('Error Handling and Secret Redaction', () => {
    it('maps 401 to AUTHENTICATION_FAILED without exposing secrets', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test_123',
        consumerSecret: 'cs_test_456',
        retryOptions: noRetryOptions,
      });

      const axiosError: any = new Error('Request failed with status code 401');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 401,
        data: { message: 'Invalid signature for key ck_test_123' },
      };
      mockAxiosInstance.request.mockRejectedValue(axiosError);

      await expect(client.request({ url: '/orders' })).rejects.toMatchObject({
        code: 'AUTHENTICATION_FAILED',
        statusCode: 401,
      });

      try {
        await client.request({ url: '/orders' });
      } catch (err: any) {
        expect(err.message).not.toContain('ck_test_123');
        expect(err.message).toContain('[REDACTED]');
      }
    });

    it('maps 403 to PERMISSION_DENIED', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      const axiosError: any = new Error('Forbidden');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 403,
        data: { message: 'User cannot view resources' },
      };
      mockAxiosInstance.request.mockRejectedValue(axiosError);

      await expect(client.request({ url: '/orders' })).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
        statusCode: 403,
      });
    });

    it('maps 404 to NOT_FOUND', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      const axiosError: any = new Error('Not Found');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 404,
        data: { message: 'Order 9999 does not exist' },
      };
      mockAxiosInstance.request.mockRejectedValue(axiosError);

      await expect(client.request({ url: '/orders/9999' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });

    it('maps 429 to RATE_LIMITED and extracts retry-after', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      const axiosError: any = new Error('Too Many Requests');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 429,
        headers: { 'retry-after': '3' },
        data: { message: 'Rate limit exceeded' },
      };
      mockAxiosInstance.request.mockRejectedValue(axiosError);

      try {
        await client.request({ url: '/orders' });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(CartixError);
        expect(err.code).toBe('RATE_LIMITED');
        expect(err.retryAfterMs).toBe(3000);
      }
    });

    it('maps timeout to UPSTREAM_TIMEOUT', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      const axiosError: any = new Error('timeout of 5000ms exceeded');
      axiosError.isAxiosError = true;
      axiosError.code = 'ECONNABORTED';
      mockAxiosInstance.request.mockRejectedValue(axiosError);

      await expect(client.request({ url: '/orders' })).rejects.toMatchObject({
        code: 'UPSTREAM_TIMEOUT',
        statusCode: 504,
      });
    });
  });

  describe('Orders API', () => {
    it('fetches list of orders and parses total headers', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      const mockOrders = [
        { id: 101, status: 'pending', total: '2499' },
        { id: 102, status: 'completed', total: '1299' },
      ];

      mockAxiosInstance.request.mockResolvedValue({
        data: mockOrders,
        headers: {
          'x-wp-total': '45',
          'x-wp-totalpages': '3',
        },
      });

      const ordersApi = new WooCommerceOrdersApi(client);
      const res = await ordersApi.listOrders({ status: 'pending', page: 1, per_page: 20 });

      expect(res.data).toEqual(mockOrders);
      expect(res.total).toBe(45);
      expect(res.totalPages).toBe(3);
    });

    it('fetches single order by ID', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      const mockOrder = { id: 101, status: 'pending', total: '2499' };
      mockAxiosInstance.request.mockResolvedValue({
        data: mockOrder,
        headers: {},
      });

      const ordersApi = new WooCommerceOrdersApi(client);
      const res = await ordersApi.getOrder(101);

      expect(res).toEqual(mockOrder);
    });
  });

  describe('Products & Inventory API', () => {
    it('fetches single product by ID', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      const mockProduct = { id: 87, name: 'Keyboard', price: '4999' };
      mockAxiosInstance.request.mockResolvedValue({
        data: mockProduct,
        headers: {},
      });

      const productsApi = new WooCommerceProductsApi(client);
      const res = await productsApi.getProduct(87);

      expect(res).toEqual(mockProduct);
    });

    it('filters low stock products correctly', async () => {
      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      const mockProducts = [
        { id: 1, name: 'Normal', manage_stock: true, stock_quantity: 50, stock_status: 'instock', backorders: 'no', backorders_allowed: false, backordered: false },
        { id: 2, name: 'Low Stock Item', manage_stock: true, stock_quantity: 3, low_stock_amount: 5, stock_status: 'instock', backorders: 'no', backorders_allowed: false, backordered: false },
        { id: 3, name: 'Out of Stock Item', manage_stock: true, stock_quantity: 0, stock_status: 'outofstock', backorders: 'no', backorders_allowed: false, backordered: false },
      ];

      mockAxiosInstance.request.mockResolvedValue({
        data: mockProducts,
        headers: { 'x-wp-total': '3' },
      });

      const inventoryApi = new WooCommerceInventoryApi(client);
      const res = await inventoryApi.getInventory({ lowStockOnly: true });

      expect(res.data.length).toBe(2);
      expect(res.data.map((p) => p.id)).toEqual([2, 3]);
    });
  });
});
