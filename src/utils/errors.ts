export type CartixErrorCode =
  | 'INVALID_INPUT'
  | 'AUTHENTICATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL_ERROR';

export interface CartixErrorPayload {
  error: CartixErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryAfterMs?: number;
}

export class CartixError extends Error {
  public readonly code: CartixErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryAfterMs?: number;

  constructor(code: CartixErrorCode, message: string, statusCode = 500, details?: Record<string, unknown>, retryAfterMs?: number) {
    super(message);
    this.name = 'CartixError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, CartixError.prototype);
  }

  toJSON(): CartixErrorPayload {
    return {
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
      ...(this.retryAfterMs !== undefined && { retryAfterMs: this.retryAfterMs }),
    };
  }
}
