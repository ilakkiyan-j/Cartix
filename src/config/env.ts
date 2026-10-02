import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  // WooCommerce Configuration
  WOOCOMMERCE_URL: z.string().url({ message: 'WOOCOMMERCE_URL must be a valid URL (e.g., https://store.example.com)' }).optional().or(z.literal('')).default(''),
  WOOCOMMERCE_CONSUMER_KEY: z.string().optional().default(''),
  WOOCOMMERCE_CONSUMER_SECRET: z.string().optional().default(''),
  WOOCOMMERCE_SEED_CONSUMER_KEY: z.string().optional().default(''),
  WOOCOMMERCE_SEED_CONSUMER_SECRET: z.string().optional().default(''),

  // Server Configuration
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MCP_TRANSPORT: z.enum(['stdio', 'streamable-http', 'sse']).default('streamable-http'),

  // Reliability Configuration
  MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(500),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  MAX_PAGE_SIZE: z.coerce.number().int().positive().max(100).default(100),

  // Observability Configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Demo Agent Configuration (Optional)
  LLM_API_KEY: z.string().optional().default(''),
  LLM_MODEL: z.string().optional().default('gemini-3.8-flash'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates and loads application environment configuration.
 * Throws structured descriptive errors if critical variables fail validation.
 */
export function loadConfig(customEnv?: Record<string, string | undefined>): EnvConfig {
  const source = customEnv || process.env;
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`[Cartix Config Error] Invalid environment configuration:\n${formattedErrors}`);
  }

  return result.data;
}

export const config = loadConfig();
