import 'server-only';
import { z } from 'zod';
import { env } from '@/lib/env';
import { verifyHmacSha256Hex } from '@/lib/hmac';
import { WebhookSignatureError } from '../errors';
import type { PaymentProvider, ProviderPaymentUpdate } from './types';

export const MOCK_SIGNATURE_HEADER = 'x-mock-signature';

/** Подія, яку «надсилає» тестовий платіжний шлюз (див. mock-gateway.ts). */
export const mockWebhookSchema = z.object({
  eventId: z.string().min(1),
  externalId: z.string().min(1),
  status: z.enum(['success', 'failure']),
  amount: z.number().int().nonnegative(),
  currency: z.literal('UAH'),
  occurredAt: z.iso.datetime(),
  failureReason: z.string().optional(),
});

export type MockWebhookEvent = z.infer<typeof mockWebhookSchema>;

/**
 * Тестовий провайдер: працює без ключів і зовнішніх сервісів, але поводиться як справжній —
 * окрема сторінка оплати, асинхронний вебхук з HMAC-підписом, статус рахунку змінює лише вебхук.
 */
export const mockProvider: PaymentProvider = {
  id: 'MOCK',

  async createCheckout({ paymentId }) {
    return { externalId: `mock_${paymentId}`, checkoutUrl: `${env.APP_URL}/pay/mock/${paymentId}` };
  },

  async verifyAndParseWebhook(rawBody, headers): Promise<ProviderPaymentUpdate> {
    if (!verifyHmacSha256Hex(env.MOCK_WEBHOOK_SECRET, rawBody, headers.get(MOCK_SIGNATURE_HEADER))) {
      throw new WebhookSignatureError();
    }
    const event = mockWebhookSchema.parse(JSON.parse(rawBody));
    return {
      provider: 'MOCK',
      dedupeKey: event.eventId,
      externalId: event.externalId,
      status: event.status === 'success' ? 'SUCCEEDED' : 'FAILED',
      amount: event.amount,
      currency: event.currency,
      occurredAt: new Date(event.occurredAt),
      failureReason: event.failureReason,
      raw: event,
    };
  },
};
