import { describe, it, expect, vi } from 'vitest';
import { executeWithRetry, isRetryableError, calculateBackoffDelay } from '../../src/middleware/retry.js';
import { CartixError } from '../../src/utils/errors.js';

describe('Retry and Backoff Middleware', () => {
  describe('isRetryableError', () => {
    it('identifies 429 RATE_LIMITED as retryable', () => {
      const err = new CartixError('RATE_LIMITED', 'Too many requests', 429);
      expect(isRetryableError(err)).toBe(true);
    });

    it('identifies 5xx and UPSTREAM_UNAVAILABLE as retryable', () => {
      const err = new CartixError('UPSTREAM_UNAVAILABLE', 'Bad gateway', 502);
      expect(isRetryableError(err)).toBe(true);
    });

    it('identifies UPSTREAM_TIMEOUT as retryable', () => {
      const err = new CartixError('UPSTREAM_TIMEOUT', 'Timed out', 504);
      expect(isRetryableError(err)).toBe(true);
    });

    it('identifies 401 AUTHENTICATION_FAILED as non-retryable', () => {
      const err = new CartixError('AUTHENTICATION_FAILED', 'Invalid key', 401);
      expect(isRetryableError(err)).toBe(false);
    });

    it('identifies 403 PERMISSION_DENIED as non-retryable', () => {
      const err = new CartixError('PERMISSION_DENIED', 'Forbidden', 403);
      expect(isRetryableError(err)).toBe(false);
    });

    it('identifies 404 NOT_FOUND as non-retryable', () => {
      const err = new CartixError('NOT_FOUND', 'Not found', 404);
      expect(isRetryableError(err)).toBe(false);
    });

    it('identifies 400 INVALID_INPUT as non-retryable', () => {
      const err = new CartixError('INVALID_INPUT', 'Bad request', 400);
      expect(isRetryableError(err)).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('calculates exponential delay with base delay', () => {
      const delay1 = calculateBackoffDelay(1, 100);
      expect(delay1).toBeGreaterThanOrEqual(80);
      expect(delay1).toBeLessThanOrEqual(120);

      const delay2 = calculateBackoffDelay(2, 100);
      expect(delay2).toBeGreaterThanOrEqual(160);
      expect(delay2).toBeLessThanOrEqual(240);

      const delay3 = calculateBackoffDelay(3, 100);
      expect(delay3).toBeGreaterThanOrEqual(320);
      expect(delay3).toBeLessThanOrEqual(480);
    });

    it('uses retryAfterMs when provided with small jitter', () => {
      const delay = calculateBackoffDelay(1, 100, 3000);
      expect(delay).toBeGreaterThanOrEqual(3050);
      expect(delay).toBeLessThanOrEqual(3250);
    });
  });

  describe('executeWithRetry', () => {
    it('returns result on immediate success without retry', async () => {
      const op = vi.fn().mockResolvedValue('success');
      const sleepFn = vi.fn();

      const result = await executeWithRetry(op, { maxRetries: 3, sleepFn });

      expect(result).toBe('success');
      expect(op).toHaveBeenCalledTimes(1);
      expect(sleepFn).not.toHaveBeenCalled();
    });

    it('retries on 429 and succeeds after 2 attempts', async () => {
      const op = vi
        .fn()
        .mockRejectedValueOnce(new CartixError('RATE_LIMITED', 'Rate limit', 429, undefined, 100))
        .mockResolvedValueOnce('success after retry');
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      const result = await executeWithRetry(op, { maxRetries: 3, baseDelayMs: 50, sleepFn });

      expect(result).toBe('success after retry');
      expect(op).toHaveBeenCalledTimes(2);
      expect(sleepFn).toHaveBeenCalledTimes(1);
    });

    it('retries on 500 and exhausts max retries before throwing', async () => {
      const op = vi.fn().mockRejectedValue(new CartixError('UPSTREAM_UNAVAILABLE', 'Server Error', 500));
      const sleepFn = vi.fn().mockResolvedValue(undefined);

      await expect(
        executeWithRetry(op, { maxRetries: 3, baseDelayMs: 10, sleepFn })
      ).rejects.toMatchObject({
        code: 'UPSTREAM_UNAVAILABLE',
        statusCode: 500,
      });

      expect(op).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(sleepFn).toHaveBeenCalledTimes(3);
    });

    it('fails immediately on non-retryable 401 without sleeping', async () => {
      const op = vi.fn().mockRejectedValue(new CartixError('AUTHENTICATION_FAILED', 'Auth failed', 401));
      const sleepFn = vi.fn();

      await expect(
        executeWithRetry(op, { maxRetries: 3, sleepFn })
      ).rejects.toMatchObject({
        code: 'AUTHENTICATION_FAILED',
        statusCode: 401,
      });

      expect(op).toHaveBeenCalledTimes(1);
      expect(sleepFn).not.toHaveBeenCalled();
    });
  });
});
