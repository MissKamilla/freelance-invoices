import { afterEach, describe, expect, it, vi } from 'vitest';

const VALID_LOCAL = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/invoices',
  BETTER_AUTH_SECRET: 'local-dev-secret-change-me-0123456789abcdef',
  BETTER_AUTH_URL: 'http://localhost:3000',
  APP_URL: 'http://localhost:3000',
  DEMO_MODE: 'true',
  PAYMENT_PROVIDER: 'mock',
  MOCK_WEBHOOK_SECRET: 'local-mock-webhook-secret',
  INNGEST_DEV: '0',
  INNGEST_SIGNING_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

async function loadEnv(overrides: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...VALID_LOCAL, ...overrides })) vi.stubEnv(key, value);
  return import('./env');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('env', () => {
  it('розбирає локальну конфігурацію з .env.example', async () => {
    const { env, demoOnlySettings } = await loadEnv({ NODE_ENV: 'development' });
    expect(env.DEMO_MODE).toBe(true);
    expect(env.PAYMENT_PROVIDER).toBe('mock');
    expect(demoOnlySettings).toHaveLength(5);
    expect(demoOnlySettings).toContain('INNGEST_SIGNING_KEY з .env.example');
  });

  it('Inngest Dev Server (INNGEST_DEV=1, без підпису запитів) теж лише для локального запуску', async () => {
    const { demoOnlySettings } = await loadEnv({ NODE_ENV: 'development', INNGEST_DEV: '1' });
    expect(demoOnlySettings).toContain('INNGEST_DEV=1');
  });

  it('відхиляє monobank без токена', async () => {
    await expect(loadEnv({ NODE_ENV: 'development', PAYMENT_PROVIDER: 'monobank' })).rejects.toThrow(
      'Невалідні змінні оточення',
    );
  });

  it('production з публічним APP_URL і демо-налаштуваннями не стартує', async () => {
    await expect(loadEnv({ NODE_ENV: 'production', APP_URL: 'https://invoices.example.com' })).rejects.toThrow(
      'Демо-налаштування в production',
    );
  });

  it('production на localhost лише попереджає — щоб можна було перевірити збірку', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(loadEnv({ NODE_ENV: 'production' })).resolves.toBeDefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('DEMO_MODE=true'));
  });

  it('під час next build не шумить у логах кожного воркера', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await loadEnv({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('production з безпечними налаштуваннями проходить мовчки', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { demoOnlySettings } = await loadEnv({
      NODE_ENV: 'production',
      APP_URL: 'https://invoices.example.com',
      DEMO_MODE: 'false',
      PAYMENT_PROVIDER: 'monobank',
      MONOBANK_TOKEN: 'uTestToken',
      BETTER_AUTH_SECRET: 'a-real-secret-that-is-at-least-32-chars-long',
      MOCK_WEBHOOK_SECRET: 'another-real-secret',
      INNGEST_DEV: '',
      INNGEST_SIGNING_KEY: 'f'.repeat(64),
    });
    expect(demoOnlySettings).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
});
