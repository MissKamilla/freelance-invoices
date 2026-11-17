import 'server-only';
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const envSchema = z
  .object({
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    APP_URL: z.url(),
    DEMO_MODE: z.stringbool().default(false),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    MAIL_FROM: z.string().default('Freelance Invoices <no-reply@freelance.local>'),
    REMINDER_DEMO_MODE: z.stringbool().default(false),
    PAYMENT_PROVIDER: z.enum(['mock', 'monobank']).default('mock'),
    MOCK_WEBHOOK_SECRET: z.string().min(8),
    MONOBANK_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
    PUBLIC_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  })
  .refine((env) => env.PAYMENT_PROVIDER !== 'monobank' || env.MONOBANK_TOKEN, {
    message: 'PAYMENT_PROVIDER=monobank потребує MONOBANK_TOKEN',
    path: ['MONOBANK_TOKEN'],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Невалідні змінні оточення:', z.prettifyError(parsed.error));
  throw new Error('Невалідні змінні оточення — перевірте .env (див. .env.example)');
}

export const env = parsed.data;

// ─── Запобіжник для production ──────────────────────────────────────────────
// .env.example навмисно вмикає демо-акаунт, mock-оплату, Inngest без підпису й відомі секрети — це безпечно лише
// локально. Production-збірка з публічним APP_URL і такими налаштуваннями не стартує; з localhost — лише попередження,
// щоб `pnpm build && pnpm start` для перевірки збірки працював.
const EXAMPLE_SECRETS = new Set(['local-dev-secret-change-me-0123456789abcdef', 'local-mock-webhook-secret']);
const isLocalUrl = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url);

export const demoOnlySettings = [
  env.DEMO_MODE && 'DEMO_MODE=true',
  env.PAYMENT_PROVIDER === 'mock' && 'PAYMENT_PROVIDER=mock',
  process.env.INNGEST_DEV === '1' && 'INNGEST_DEV=1',
  EXAMPLE_SECRETS.has(env.BETTER_AUTH_SECRET) && 'BETTER_AUTH_SECRET з .env.example',
  EXAMPLE_SECRETS.has(env.MOCK_WEBHOOK_SECRET) && 'MOCK_WEBHOOK_SECRET з .env.example',
].filter((item): item is string => typeof item === 'string');

if (process.env.NODE_ENV === 'production' && demoOnlySettings.length > 0) {
  const message = `Демо-налаштування в production: ${demoOnlySettings.join(', ')}`;
  if (!isLocalUrl(env.APP_URL)) {
    throw new Error(`${message}. Для публічного розгортання вони заборонені — див. .env.example.`);
  }
  // Під час `next build` модуль виконується в кожному воркері — попереджаємо лише при старті сервера.
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn(`[env] ${message} — припустимо лише для локальної перевірки production-збірки.`);
  }
}
