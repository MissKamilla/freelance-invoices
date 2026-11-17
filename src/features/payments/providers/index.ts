import 'server-only';
import { env } from '@/lib/env';
import { mockProvider } from './mock';
import type { PaymentProvider, ProviderId } from './types';

const providers: Partial<Record<ProviderId, PaymentProvider>> = {
  MOCK: mockProvider,
};

/** Провайдер для нових платежів (PAYMENT_PROVIDER у .env). */
export function getActiveProvider(): PaymentProvider {
  const id: ProviderId = env.PAYMENT_PROVIDER === 'monobank' ? 'MONOBANK' : 'MOCK';
  return getProvider(id);
}

/** Провайдер існуючого платежу (вебхуки, звірка, скасування). */
export function getProvider(id: ProviderId): PaymentProvider {
  const provider = providers[id];
  if (!provider) throw new Error(`Payment provider ${id} is not configured`);
  return provider;
}
