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

// Публічний ключ для перевірки підпису вебхуків. Кешуємо; при невдалій перевірці перезапитуємо (ключ може
// змінитися), але не частіше ніж раз на 5 хвилин — інакше потік підроблених вебхуків перетворюється
// на потік наших запитів до банку.
const PUBKEY_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let publicKeyCache: { key: string; fetchedAt: number } | null = null;
let publicKeyRequest: Promise<string> | null = null;
async function getPublicKey(refresh = false): Promise<string> {
  if (publicKeyCache && !(refresh && Date.now() - publicKeyCache.fetchedAt > PUBKEY_REFRESH_INTERVAL_MS)) {
    return publicKeyCache.key;
  }
  // Один запит на всіх, хто чекає: паралельні вебхуки на холодному кеші не породжують N звернень до банку.
  publicKeyRequest ??= monobankRequest<{ key: string }>('/api/merchant/pubkey')
    .then(({ key }) => {
      publicKeyCache = { key, fetchedAt: Date.now() };
      return key;
    })
    .finally(() => {
      publicKeyRequest = null;
    });
  return publicKeyRequest;
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
