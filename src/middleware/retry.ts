import { config } from '../config/env.js';
import { CartixError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  requestId?: string;
  operationName?: string;
  sleepFn?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Determines whether a given CartixError is eligible for retry.
 * 429 (Rate limited) and 5xx / timeouts / network errors are retryable.
 * Client errors (400, 401, 403, 404) are NOT retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof CartixError) {
    if (error.code === 'RATE_LIMITED') return true;
    if (error.code === 'UPSTREAM_UNAVAILABLE') return true;
    if (error.code === 'UPSTREAM_TIMEOUT') return true;
    if (error.statusCode >= 500) return true;
    return false;
  }
  return false;
}

/**
 * Calculates backoff delay with exponential scaling and randomized jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = config.RETRY_BASE_DELAY_MS,
  retryAfterMs?: number
): number {
  if (retryAfterMs !== undefined && retryAfterMs > 0) {
    // Respect upstream Retry-After plus a small jitter (50-200ms)
    const jitter = Math.floor(Math.random() * 150) + 50;
    return retryAfterMs + jitter;
  }

  // Exponential backoff: baseDelay * 2^(attempt - 1)
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
  // Full jitter: random between 0.8x and 1.2x
  const jitterFactor = 0.8 + Math.random() * 0.4;
  return Math.floor(exponentialDelay * jitterFactor);
}

/**
 * Wraps an async operation with bounded retry and exponential backoff.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? config.MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? config.RETRY_BASE_DELAY_MS;
  const requestId = options.requestId || `req_${Date.now()}`;
  const operationName = options.operationName || 'operation';
  const sleep = options.sleepFn || defaultSleep;

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (err: unknown) {
      attempt++;

      if (attempt > maxRetries || !isRetryableError(err)) {
        throw err;
      }

      const cartixErr = err as CartixError;
      const delayMs = calculateBackoffDelay(attempt, baseDelayMs, cartixErr.retryAfterMs);

      logger.warn(
        `[Retry ${attempt}/${maxRetries}] ${operationName} failed with ${cartixErr.code} (${cartixErr.statusCode}). Retrying in ${delayMs}ms...`,
        {
          requestId,
          attempt,
          maxRetries,
          errorCode: cartixErr.code,
          delayMs,
        }
      );

      await sleep(delayMs);
    }
  }
}
