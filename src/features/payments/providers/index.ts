import 'server-only';
import { env } from '@/lib/env';
import { mockProvider } from './mock';
import { monobankProvider } from './monobank';
import type { PaymentProvider, ProviderId } from './types';

const providers: Record<ProviderId, PaymentProvider> = {
  MOCK: mockProvider,
  MONOBANK: monobankProvider,
};

/** Провайдер для нових платежів (PAYMENT_PROVIDER у .env; monobank — лише з MONOBANK_TOKEN). */
export function getActiveProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER === 'monobank' ? monobankProvider : mockProvider;
}

/** Провайдер існуючого платежу (вебхуки, звірка, скасування). */
export function getProvider(id: ProviderId): PaymentProvider {
  return providers[id];
}

export function isProviderId(value: string): value is ProviderId {
  return value === 'MOCK' || value === 'MONOBANK';
}
