import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { config, EnvConfig } from '../config/env.js';
import { CartixError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { executeWithRetry, RetryOptions } from '../middleware/retry.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { WooCommerceApiResponse } from './types.js';

export interface WooCommerceClientOptions {
  url?: string;
  consumerKey?: string;
  consumerSecret?: string;
  timeoutMs?: number;
  retryOptions?: RetryOptions;
}

export class WooCommerceClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private retryOptions?: RetryOptions;

  constructor(options?: WooCommerceClientOptions, envConfig: EnvConfig = config) {
    const rawUrl = options?.url !== undefined ? options.url : envConfig.WOOCOMMERCE_URL;
    const consumerKey = options?.consumerKey !== undefined ? options.consumerKey : envConfig.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = options?.consumerSecret !== undefined ? options.consumerSecret : envConfig.WOOCOMMERCE_CONSUMER_SECRET;
    const timeout = options?.timeoutMs || envConfig.REQUEST_TIMEOUT_MS;
    this.retryOptions = options?.retryOptions;

    if (!rawUrl) {
      throw new CartixError(
        'INVALID_INPUT',
        'WOOCOMMERCE_URL is not configured. Please set it in your .env file.',
        400
      );
    }

    // Normalize base URL (strip trailing slash)
    this.baseUrl = rawUrl.replace(/\/+$/, '');

    // Encode Basic Auth header: base64(consumer_key:consumer_secret)
    const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`;

    this.axiosInstance = axios.create({
      baseURL: `${this.baseUrl}/wp-json/wc/v3`,
      timeout,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Cartix-MCP-Connector/0.1.0',
      },
    });
  }

  /**
   * Executes a typed HTTP request against the WooCommerce REST API with retry, backoff, and error mapping.
   */
  async request<T>(requestConfig: AxiosRequestConfig, customRetry?: RetryOptions): Promise<WooCommerceApiResponse<T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const operationName = `WooCommerce ${requestConfig.method || 'GET'} ${requestConfig.url}`;

    // Acquire rate limit token
    await rateLimiter.acquire(1);

    return executeWithRetry<WooCommerceApiResponse<T>>(
      async () => {
        try {
          logger.debug(`[${requestId}] ${operationName}`, { params: requestConfig.params });

          const startTime = Date.now();
          const response: AxiosResponse<T> = await this.axiosInstance.request<T>(requestConfig);
          const durationMs = Date.now() - startTime;

          logger.debug(`[${requestId}] ${operationName} completed in ${durationMs}ms (HTTP ${response.status})`);

          const total = parseInt(response.headers['x-wp-total'] || '0', 10);
          const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);

          return {
            data: response.data,
            total: isNaN(total) ? 0 : total,
            totalPages: isNaN(totalPages) ? 1 : totalPages,
          };
        } catch (err: unknown) {
          throw this.handleAxiosError(err);
        }
      },
      {
        requestId,
        operationName,
        ...this.retryOptions,
        ...customRetry,
      }
    );
  }

  /**
   * Maps Axios and network errors into structured CartixError instances.
   */
  public handleAxiosError(err: unknown): CartixError {
    if (!axios.isAxiosError(err)) {
      if (err instanceof CartixError) return err;
      return new CartixError(
        'INTERNAL_ERROR',
        `Unexpected error during WooCommerce request: ${err instanceof Error ? err.message : String(err)}`,
        500
      );
    }

    const axiosError = err as AxiosError<{ message?: string; code?: string; data?: { status?: number } }>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const upstreamMessage = responseData?.message || axiosError.message;

    // Redact any potential credentials from error message
    const cleanMessage = upstreamMessage.replace(/ck_[a-zA-Z0-9_-]+/g, '[REDACTED]').replace(/cs_[a-zA-Z0-9_-]+/g, '[REDACTED]');

    // Timeout / Network Abort
    if (axiosError.code === 'ECONNABORTED' || (axiosError.message && axiosError.message.includes('timeout'))) {
      return new CartixError(
        'UPSTREAM_TIMEOUT',
        `WooCommerce API request timed out after ${this.axiosInstance.defaults.timeout}ms`,
        504
      );
    }

    // HTTP Status Code Specific Mapping
    switch (status) {
      case 401:
        return new CartixError(
          'AUTHENTICATION_FAILED',
          `WooCommerce authentication failed. Check your Consumer Key and Consumer Secret. (${cleanMessage})`,
          401
        );
      case 403:
        return new CartixError(
          'PERMISSION_DENIED',
          `WooCommerce permission denied. The configured API key lacks required permissions. (${cleanMessage})`,
          403
        );
      case 404:
        return new CartixError(
          'NOT_FOUND',
          `The requested resource was not found on the WooCommerce store. (${cleanMessage})`,
          404
        );
      case 429: {
        const retryAfterHeader = axiosError.response?.headers['retry-after'];
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1;
        const retryAfterMs = isNaN(retryAfterSeconds) ? 1000 : retryAfterSeconds * 1000;
        return new CartixError(
          'RATE_LIMITED',
          `WooCommerce API rate limit exceeded. Retry after ${retryAfterSeconds}s.`,
          429,
          undefined,
          retryAfterMs
        );
      }
      default:
        if (status && status >= 500) {
          return new CartixError(
            'UPSTREAM_UNAVAILABLE',
            `WooCommerce server error (${status}): ${cleanMessage}`,
            502
          );
        }
        return new CartixError(
          'UPSTREAM_UNAVAILABLE',
          `Failed to communicate with WooCommerce store: ${cleanMessage}`,
          status || 500
        );
    }
  }

  /**
   * Helper to verify connectivity and authentication against the WooCommerce instance.
   */
  async verifyConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      await this.request({
        url: '/system_status',
        method: 'GET',
      });
      return { connected: true, message: 'Successfully connected and authenticated with WooCommerce.' };
    } catch {
      // If /system_status requires write or admin access, fallback to checking /products with per_page=1
      try {
        await this.request({
          url: '/products',
          method: 'GET',
          params: { per_page: 1 },
        });
        return { connected: true, message: 'Successfully connected to WooCommerce store (Read-Only access verified).' };
      } catch (fallbackErr) {
        const cartixErr = fallbackErr instanceof CartixError ? fallbackErr : this.handleAxiosError(fallbackErr);
        return { connected: false, message: cartixErr.message };
      }
    }
  }
}

export const wooCommerceClient = new WooCommerceClient();
