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
