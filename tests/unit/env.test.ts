import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/env.js';

describe('Environment Configuration', () => {
  it('loads default values when optional variables are omitted', () => {
    const testConfig = loadConfig({});
    expect(testConfig.PORT).toBe(3000);
    expect(testConfig.NODE_ENV).toBe('development');
    expect(testConfig.MAX_RETRIES).toBe(3);
    expect(testConfig.RETRY_BASE_DELAY_MS).toBe(500);
    expect(testConfig.REQUEST_TIMEOUT_MS).toBe(10000);
    expect(testConfig.MAX_PAGE_SIZE).toBe(100);
    expect(testConfig.LOG_LEVEL).toBe('info');
  });

  it('validates URL format for WOOCOMMERCE_URL', () => {
    expect(() => {
      loadConfig({ WOOCOMMERCE_URL: 'invalid-url-string' });
    }).toThrow(/WOOCOMMERCE_URL must be a valid URL/);
  });

  it('accepts valid custom configuration', () => {
    const testConfig = loadConfig({
      WOOCOMMERCE_URL: 'https://myshop.example.com',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test_123',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test_456',
      PORT: '8080',
      NODE_ENV: 'production',
      MAX_RETRIES: '5',
      MAX_PAGE_SIZE: '50',
    });

    expect(testConfig.WOOCOMMERCE_URL).toBe('https://myshop.example.com');
    expect(testConfig.PORT).toBe(8080);
    expect(testConfig.NODE_ENV).toBe('production');
    expect(testConfig.MAX_RETRIES).toBe(5);
    expect(testConfig.MAX_PAGE_SIZE).toBe(50);
  });
});
