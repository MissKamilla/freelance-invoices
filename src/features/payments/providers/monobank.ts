import 'server-only';
import { env } from '@/lib/env';
import { WebhookSignatureError } from '../errors';
import {
  buildCreateInvoiceBody,
  MONOBANK_API,
  MONOBANK_SIGNATURE_HEADER,
  monobankInvoiceSchema,
  toProviderUpdate,
  verifyMonobankSignature,
} from './monobank-core';
import type { PaymentProvider } from './types';

async function monobankRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!env.MONOBANK_TOKEN) throw new Error('MONOBANK_TOKEN is not set');
  const response = await fetch(`${MONOBANK_API}${path}`, {
    ...init,
    headers: { 'X-Token': env.MONOBANK_TOKEN, 'Content-Type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`monobank ${path} → ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

// Публічний ключ для перевірки підпису вебхуків. Кешуємо; при невдалій перевірці перезапитуємо один раз
// (ключ може змінитися).
let publicKeyCache: string | null = null;
async function getPublicKey(refresh = false): Promise<string> {
  if (!publicKeyCache || refresh) {
    publicKeyCache = (await monobankRequest<{ key: string }>('/api/merchant/pubkey')).key;
  }
  return publicKeyCache;
}

export const monobankProvider: PaymentProvider = {
  id: 'MONOBANK',

  async createCheckout(input) {
    const { invoiceId, pageUrl } = await monobankRequest<{ invoiceId: string; pageUrl: string }>(
      '/api/merchant/invoice/create',
      { method: 'POST', body: JSON.stringify(buildCreateInvoiceBody(input)) },
    );
    return { externalId: invoiceId, checkoutUrl: pageUrl };
  },

  async verifyAndParseWebhook(rawBody, headers) {
    const signature = headers.get(MONOBANK_SIGNATURE_HEADER);
    const valid =
      verifyMonobankSignature(rawBody, signature, await getPublicKey()) ||
      verifyMonobankSignature(rawBody, signature, await getPublicKey(true));
    if (!valid) throw new WebhookSignatureError();
    return toProviderUpdate(monobankInvoiceSchema.parse(JSON.parse(rawBody)));
  },

  async fetchStatus(externalId) {
    const invoice = await monobankRequest<unknown>(
      `/api/merchant/invoice/status?invoiceId=${encodeURIComponent(externalId)}`,
    );
    return toProviderUpdate(monobankInvoiceSchema.parse(invoice));
  },

  async cancel(externalId) {
    await monobankRequest('/api/merchant/invoice/remove', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: externalId }),
    });
  },
};
