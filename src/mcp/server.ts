import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { CARTIX_TOOLS, TOOL_HANDLERS } from './tools/index.js';
import { CartixError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function createCartixMcpServer(): Server {
  const server = new Server(
    {
      name: 'cartix',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Tool Discovery Handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('MCP ListTools requested', { toolCount: CARTIX_TOOLS.length });
    return {
      tools: CARTIX_TOOLS,
    };
  });

  // Tool Execution Handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    logger.info(`MCP CallTool received: ${name}`, { arguments: toolArgs });

    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      logger.warn(`MCP CallTool unknown tool: ${name}`);
      throw new McpError(ErrorCode.MethodNotFound, `Tool '${name}' is not recognized by Cartix.`);
    }

    try {
      const result = await handler(toolArgs || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      logger.error(`Error executing tool '${name}':`, {
        error: err instanceof Error ? err.message : String(err),
      });

      if (err instanceof CartixError) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify(err.toJSON(), null, 2),
            },
          ],
        };
      }

      const internalErr = new CartixError(
        'INTERNAL_ERROR',
        `Internal error executing tool ${name}: ${err instanceof Error ? err.message : String(err)}`,
        500
      );

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(internalErr.toJSON(), null, 2),
          },
        ],
      };
    }
  });

  return server;
}

export async function runServer(): Promise<void> {
  const server = createCartixMcpServer();
  const transport = new StdioServerTransport();

  logger.info('Starting Cartix MCP Server on stdio transport...');
  await server.connect(transport);
  logger.info('Cartix MCP Server connected and ready to process requests.');
}
