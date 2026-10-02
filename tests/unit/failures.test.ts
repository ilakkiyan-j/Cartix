import { describe, it, expect, vi } from 'vitest';
import { OrderService } from '../../src/services/order.service.js';
import { ProductService } from '../../src/services/product.service.js';
import { InventoryService } from '../../src/services/inventory.service.js';
import { WooCommerceClient } from '../../src/wooCommerce/client.js';
import axios from 'axios';

describe('Failure and Edge Case Tests', () => {
  const noRetryOptions = { maxRetries: 0, baseDelayMs: 0, sleepFn: async () => {} };

  describe('Validation & Malformed Inputs', () => {
    const orderService = new OrderService({} as any);
    const productService = new ProductService({} as any);
    const inventoryService = new InventoryService({} as any);

    it('rejects malformed date_from in search_orders', async () => {
      await expect(
        orderService.searchOrders({ date_from: '2026-13-45' })
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        statusCode: 400,
      });
    });

    it('rejects non-integer order_id in get_order', async () => {
      await expect(
        orderService.getOrder({ order_id: 12.34 })
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        statusCode: 400,
      });
    });

    it('rejects string or negative product_id in get_product', async () => {
      await expect(
        productService.getProduct({ product_id: -10 } as any)
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        statusCode: 400,
      });

      await expect(
        productService.getProduct({ product_id: 'invalid' } as any)
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        statusCode: 400,
      });
    });

    it('rejects page size exceeding max limit in get_inventory', async () => {
      await expect(
        inventoryService.getInventory({ limit: 500 })
      ).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        statusCode: 400,
      });
    });
  });

  describe('Empty Results & Boundary Conditions', () => {
    it('handles empty order search results gracefully', async () => {
      const mockOrdersApi = {
        listOrders: vi.fn().mockResolvedValue({
          data: [],
          total: 0,
          totalPages: 0,
        }),
      };

      const orderService = new OrderService(mockOrdersApi as any);
      const result = await orderService.searchOrders({ status: 'completed' });

      expect(result.orders).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.total_pages).toBe(0);
      expect(result.pagination.has_next_page).toBe(false);
    });

    it('handles empty product search results gracefully', async () => {
      const mockProductsApi = {
        listProducts: vi.fn().mockResolvedValue({
          data: [],
          total: 0,
          totalPages: 0,
        }),
      };

      const productService = new ProductService(mockProductsApi as any);
      const result = await productService.searchProducts({ query: 'nonexistent-sku-xyz' });

      expect(result.products).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.has_next_page).toBe(false);
    });
  });

  describe('Upstream Failure Scenarios', () => {
    it('maps 503 Service Unavailable to UPSTREAM_UNAVAILABLE', async () => {
      const mockAxiosInstance = {
        defaults: { timeout: 5000 },
        request: vi.fn().mockRejectedValue({
          isAxiosError: true,
          response: { status: 503, data: { message: 'Service Unavailable' } },
        }),
      };
      vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      await expect(client.request({ url: '/orders' })).rejects.toMatchObject({
        code: 'UPSTREAM_UNAVAILABLE',
        statusCode: 502,
      });
    });

    it('maps network connection errors to UPSTREAM_UNAVAILABLE without crash', async () => {
      const mockAxiosInstance = {
        defaults: { timeout: 5000 },
        request: vi.fn().mockRejectedValue({
          isAxiosError: true,
          code: 'ECONNREFUSED',
          message: 'connect ECONNREFUSED 127.0.0.1:443',
        }),
      };
      vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        retryOptions: noRetryOptions,
      });

      await expect(client.request({ url: '/products' })).rejects.toMatchObject({
        code: 'UPSTREAM_UNAVAILABLE',
        statusCode: 500,
      });
    });

    it('never leaks credentials in upstream error payloads', async () => {
      const mockAxiosInstance = {
        defaults: { timeout: 5000 },
        request: vi.fn().mockRejectedValue({
          isAxiosError: true,
          response: {
            status: 401,
            data: { message: 'Failed for ck_sensitive_key_999 and cs_sensitive_secret_888' },
          },
        }),
      };
      vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

      const client = new WooCommerceClient({
        url: 'https://store.example.com',
        consumerKey: 'ck_sensitive_key_999',
        consumerSecret: 'cs_sensitive_secret_888',
        retryOptions: noRetryOptions,
      });

      try {
        await client.request({ url: '/orders' });
        expect.fail('Should throw');
      } catch (err: any) {
        expect(err.message).not.toContain('ck_sensitive_key_999');
        expect(err.message).not.toContain('cs_sensitive_secret_888');
        expect(err.message).toContain('[REDACTED]');
      }
    });
  });
});
