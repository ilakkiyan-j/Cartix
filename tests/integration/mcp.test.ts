import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createCartixMcpServer } from '../../src/mcp/server.js';
import { orderService } from '../../src/services/order.service.js';
import { productService } from '../../src/services/product.service.js';
import { inventoryService } from '../../src/services/inventory.service.js';
import { CartixError } from '../../src/utils/errors.js';

describe('MCP Server Integration', () => {
  let client: Client;
  let server: ReturnType<typeof createCartixMcpServer>;

  beforeEach(async () => {
    server = createCartixMcpServer();
    client = new Client(
      {
        name: 'test-agent-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  describe('Tool Discovery (tools/list)', () => {
    it('discovers all 5 core Cartix read-only tools', async () => {
      const response = await client.listTools();
      const toolNames = response.tools.map((t) => t.name);

      expect(toolNames).toContain('search_orders');
      expect(toolNames).toContain('get_order');
      expect(toolNames).toContain('search_products');
      expect(toolNames).toContain('get_product');
      expect(toolNames).toContain('get_inventory');
      expect(response.tools.length).toBe(5);

      // Verify tool schema structure
      const searchOrders = response.tools.find((t) => t.name === 'search_orders')!;
      expect(searchOrders.description).toBeDefined();
      expect(searchOrders.inputSchema).toBeDefined();
      expect(searchOrders.inputSchema.properties).toHaveProperty('status');
      expect(searchOrders.inputSchema.properties).toHaveProperty('limit');
    });

    it('declares explicit boolean safety and capability hints on all 5 tools', async () => {
      const response = await client.listTools();
      expect(response.tools).toHaveLength(5);

      for (const tool of response.tools) {
        expect(tool.annotations).toBeDefined();
        expect(tool.annotations?.readOnlyHint).toBe(true);
        expect(tool.annotations?.destructiveHint).toBe(false);
        expect(tool.annotations?.idempotentHint).toBe(true);
        expect(tool.annotations?.openWorldHint).toBe(false);
      }
    });
  });

  describe('Tool Execution (tools/call)', () => {
    it('invokes search_products and returns formatted text result', async () => {
      vi.spyOn(productService, 'searchProducts').mockResolvedValueOnce({
        products: [
          {
            product_id: 87,
            name: 'Mechanical Keyboard',
            sku: 'KB-001',
            price: 4999,
            on_sale: false,
            manage_stock: true,
            stock_quantity: 15,
            stock_status: 'instock',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
          has_next_page: false,
        },
      });

      const response: any = await client.callTool({
        name: 'search_products',
        arguments: { query: 'keyboard' },
      });

      expect(response.isError).toBeFalsy();
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const parsedData = JSON.parse(response.content[0].text);
      expect(parsedData.products[0].name).toBe('Mechanical Keyboard');
      expect(parsedData.products[0].product_id).toBe(87);
    });

    it('invokes search_orders and returns normalized orders', async () => {
      vi.spyOn(orderService, 'searchOrders').mockResolvedValueOnce({
        orders: [
          {
            order_id: 1004,
            status: 'pending',
            created_at: '2026-10-01T08:20:00Z',
            currency: 'INR',
            total: 2499,
            item_count: 2,
            line_items: [
              {
                product_id: 87,
                name: 'Mechanical Keyboard',
                quantity: 2,
                price: 1249.5,
                total: 2499,
              },
            ],
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
          has_next_page: false,
        },
      });

      const response: any = await client.callTool({
        name: 'search_orders',
        arguments: { status: 'pending' },
      });

      expect(response.isError).toBeFalsy();
      const parsedData = JSON.parse(response.content[0].text);
      expect(parsedData.orders[0].order_id).toBe(1004);
      expect(parsedData.orders[0].status).toBe('pending');
    });

    it('invokes get_inventory with low_stock_only filter', async () => {
      vi.spyOn(inventoryService, 'getInventory').mockResolvedValueOnce({
        inventory: [
          {
            product_id: 12,
            name: 'Ultrawide Monitor',
            sku: 'MN-012',
            price: 29999,
            stock_quantity: 2,
            stock_status: 'instock',
            manage_stock: true,
            is_low_stock: true,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
          has_next_page: false,
        },
      });

      const response: any = await client.callTool({
        name: 'get_inventory',
        arguments: { low_stock_only: true },
      });

      expect(response.isError).toBeFalsy();
      const parsedData = JSON.parse(response.content[0].text);
      expect(parsedData.inventory[0].is_low_stock).toBe(true);
      expect(parsedData.inventory[0].product_id).toBe(12);
    });

    it('returns structured error payload with isError: true when service throws CartixError', async () => {
      vi.spyOn(orderService, 'getOrder').mockRejectedValueOnce(
        new CartixError('NOT_FOUND', 'Order 9999 was not found', 404)
      );

      const response: any = await client.callTool({
        name: 'get_order',
        arguments: { order_id: 9999 },
      });

      expect(response.isError).toBe(true);
      const parsedError = JSON.parse(response.content[0].text);
      expect(parsedError.error).toBe('NOT_FOUND');
      expect(parsedError.message).toBe('Order 9999 was not found');
    });

    it('rejects unknown tool calls with MethodNotFound error', async () => {
      await expect(
        client.callTool({
          name: 'non_existent_tool',
          arguments: {},
        })
      ).rejects.toThrow(/not recognized by Cartix/);
    });
  });
});
