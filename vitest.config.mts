import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Інтеграційні тести (*.int.test.ts) потребують Postgres — окремо: pnpm test:integration.
    exclude: [...configDefaults.exclude, 'src/**/*.int.test.ts'],
  },
});
