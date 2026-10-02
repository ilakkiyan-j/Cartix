import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { runServer } from './mcp/server.js';

export async function main() {
  logger.info('Cartix WooCommerce Agent Connector starting...', {
    env: config.NODE_ENV,
    transport: config.MCP_TRANSPORT,
  });

  try {
    await runServer();
  } catch (error) {
    logger.error('Failed to start Cartix MCP server:', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
