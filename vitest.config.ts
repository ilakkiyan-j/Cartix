import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'tests/**',
        'docs/**',
      ],
    },
    testTimeout: 10000,
    env: {
      WOOCOMMERCE_URL: 'https://test-store.example.com',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test_consumer_key',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test_consumer_secret',
      NODE_ENV: 'test',
    },
  },
});
