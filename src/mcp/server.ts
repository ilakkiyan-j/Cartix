import http from 'http';
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
import { config } from '../config/env.js';

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

  if (config.MCP_TRANSPORT === 'streamable-http' || config.MCP_TRANSPORT === 'sse') {
    const port = config.PORT;

    const httpServer = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health Check endpoint
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          name: 'cartix',
          version: '0.1.0',
          transport: config.MCP_TRANSPORT,
          tools: CARTIX_TOOLS.map(t => t.name),
          uptime: process.uptime(),
        }));
        return;
      }

      // MCP Tool Discovery / Execution endpoint
      if (req.url === '/mcp') {
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ tools: CARTIX_TOOLS }, null, 2));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const toolName = payload.name || payload.method;
              const toolArgs = payload.arguments || payload.params || {};

              const handler = TOOL_HANDLERS[toolName];
              if (!handler) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  isError: true,
                  error: `Tool '${toolName}' not found on Cartix server.`,
                  available_tools: CARTIX_TOOLS.map(t => t.name),
                }));
                return;
              }

              const result = await handler(toolArgs);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ result }, null, 2));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                isError: true,
                error: err instanceof Error ? err.message : String(err),
              }));
            }
          });
          return;
        }
      }

      // Default root endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'Cartix MCP Server',
        version: '0.1.0',
        status: 'online',
        transport: config.MCP_TRANSPORT,
        endpoints: {
          health: '/health',
          mcp: '/mcp',
        },
      }));
    });

    httpServer.listen(port, () => {
      logger.info(`Cartix MCP Server listening on HTTP transport (http://0.0.0.0:${port})...`, {
        port,
        transport: config.MCP_TRANSPORT,
        toolCount: CARTIX_TOOLS.length,
      });
    });
    return;
  }

  // Default: stdio transport (Claude Desktop / Cursor)
  const transport = new StdioServerTransport();
  logger.info('Starting Cartix MCP Server on stdio transport...');
  await server.connect(transport);
  logger.info('Cartix MCP Server connected and ready to process requests.');
}
