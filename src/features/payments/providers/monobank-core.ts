/**
 * Monobank Acquiring: чиста логіка без мережі й env — легко тестувати.
 * Документація: https://api.monobank.ua/docs/acquiring.html
 */
import { createVerify } from 'node:crypto';
import { z } from 'zod';
import type { PaymentStatus } from '@/generated/prisma/enums';
import type { CheckoutInput, ProviderPaymentUpdate } from './types';

export const MONOBANK_API = 'https://api.monobank.ua';
export const MONOBANK_SIGNATURE_HEADER = 'x-sign';
const UAH_CODE = 980;

export const monobankInvoiceSchema = z.looseObject({
  invoiceId: z.string().min(1),
  status: z.enum(['created', 'processing', 'hold', 'success', 'failure', 'reversed', 'expired']),
  amount: z.number().int().nonnegative(),
  ccy: z.number().int().optional(),
  finalAmount: z.number().int().optional(),
  modifiedDate: z.string().min(1),
  failureReason: z.string().optional(),
  errCode: z.string().optional(),
});

export type MonobankInvoice = z.infer<typeof monobankInvoiceSchema>;

const STATUS_MAP: Record<MonobankInvoice['status'], PaymentStatus> = {
  created: 'PENDING',
  processing: 'PENDING',
  hold: 'PENDING',
  success: 'SUCCEEDED',
  failure: 'FAILED',
  expired: 'EXPIRED',
  reversed: 'REFUNDED',
};

export function mapMonobankStatus(status: MonobankInvoice['status']): PaymentStatus {
  return STATUS_MAP[status];
}

/** Подія monobank → нормалізоване оновлення. Ключ ідемпотентності — invoiceId + статус + modifiedDate. */
export function toProviderUpdate(invoice: MonobankInvoice): ProviderPaymentUpdate {
  if (invoice.ccy !== undefined && invoice.ccy !== UAH_CODE) {
    throw new Error(`Unsupported monobank currency: ${invoice.ccy}`);
  }
  return {
    provider: 'MONOBANK',
    dedupeKey: `${invoice.invoiceId}:${invoice.status}:${invoice.modifiedDate}`,
    externalId: invoice.invoiceId,
    status: mapMonobankStatus(invoice.status),
    amount: invoice.amount,
    currency: 'UAH',
    occurredAt: new Date(invoice.modifiedDate),
    failureReason: invoice.failureReason ?? (invoice.errCode ? `Код помилки ${invoice.errCode}` : undefined),
    raw: invoice,
  };
}

/** Тіло POST /api/merchant/invoice/create. */
export function buildCreateInvoiceBody(input: CheckoutInput) {
  return {
    amount: input.amount,
    ccy: UAH_CODE,
    merchantPaymInfo: { reference: input.reference, destination: input.purpose.slice(0, 280) },
    redirectUrl: input.redirectUrl,
    ...(input.webhookUrl && { webHookUrl: input.webhookUrl }),
    validity: 3600,
  };
}

/** ECDSA-SHA256 над сирим тілом; ключ і підпис — base64 (ключ — base64 від PEM). */
export function verifyMonobankSignature(rawBody: string, signatureBase64: string | null, publicKeyBase64: string): boolean {
  if (!signatureBase64) return false;
  try {
    const verifier = createVerify('SHA256');
    verifier.update(rawBody);
    verifier.end();
    return verifier.verify(Buffer.from(publicKeyBase64, 'base64'), Buffer.from(signatureBase64, 'base64'));
  } catch {
    return false;
  }
}
