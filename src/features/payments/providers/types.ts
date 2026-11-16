import type { Currency, PaymentStatus } from '@/generated/prisma/enums';

export type ProviderId = 'MOCK' | 'MONOBANK';

export type CheckoutInput = {
  paymentId: string;
  /** Копійки. */
  amount: number;
  reference: string;
  purpose: string;
  redirectUrl: string;
  webhookUrl?: string;
};

/** Нормалізована подія від провайдера — однакова для вебхука й звірки статусу. */
export type ProviderPaymentUpdate = {
  provider: ProviderId;
  /** Ключ ідемпотентності події. */
  dedupeKey: string;
  externalId: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  occurredAt: Date;
  failureReason?: string;
  raw: unknown;
};

export interface PaymentProvider {
  id: ProviderId;
  createCheckout(input: CheckoutInput): Promise<{ externalId: string; checkoutUrl: string }>;
  /** Кидає WebhookSignatureError, якщо підпис невалідний. */
  verifyAndParseWebhook(rawBody: string, headers: Headers): Promise<ProviderPaymentUpdate>;
  fetchStatus?(externalId: string): Promise<ProviderPaymentUpdate>;
  cancel?(externalId: string): Promise<void>;
}
