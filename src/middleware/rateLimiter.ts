export interface RateLimiterOptions {
  maxTokens?: number;
  refillRatePerSec?: number;
}

export class TokenBucketRateLimiter {
  private maxTokens: number;
  private refillRatePerSec: number;
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(options: RateLimiterOptions = {}) {
    this.maxTokens = options.maxTokens ?? 30;
    this.refillRatePerSec = options.refillRatePerSec ?? 10;
    this.tokens = this.maxTokens;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSec;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  /**
   * Attempts to acquire 1 token. Returns true if acquired, false if rate limited.
   */
  tryAcquire(tokensRequested = 1): boolean {
    this.refill();
    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }
    return false;
  }

  /**
   * Acquires token or waits until token becomes available.
   */
  async acquire(tokensRequested = 1): Promise<void> {
    while (!this.tryAcquire(tokensRequested)) {
      const waitMs = Math.ceil((1 / this.refillRatePerSec) * 1000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export const rateLimiter = new TokenBucketRateLimiter();
