import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Інтеграційні тести працюють з окремою базою invoices_test у тому ж Postgres, що й docker compose.
loadEnv({ quiet: true });
const baseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/invoices';
const testUrl = process.env.TEST_DATABASE_URL ?? baseUrl.replace(/\/[^/?]+(\?|$)/, '/invoices_test$1');

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['src/test/integration-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'integration-test-secret-0123456789abcdef',
      BETTER_AUTH_URL: 'http://localhost:3000',
      APP_URL: 'http://localhost:3000',
      MOCK_WEBHOOK_SECRET: 'integration-test-webhook-secret',
      PAYMENT_PROVIDER: 'mock',
    },
  },
});
