import { describe, it, expect } from 'vitest';
import { CartixError } from '../../src/utils/errors.js';

describe('Error Model (CartixError)', () => {
  it('constructs structured CartixError with code, message, and statusCode', () => {
    const error = new CartixError('NOT_FOUND', 'Order #1004 was not found', 404, { orderId: 1004 });

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Order #1004 was not found');
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ orderId: 1004 });
  });

  it('serializes to JSON accurately for agent consumption', () => {
    const error = new CartixError(
      'RATE_LIMITED',
      'Rate limit exceeded. Retry later.',
      429,
      undefined,
      2000
    );

    const json = error.toJSON();
    expect(json).toEqual({
      error: 'RATE_LIMITED',
      message: 'Rate limit exceeded. Retry later.',
      retryAfterMs: 2000,
    });
  });
});
