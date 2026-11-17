import { createSign, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildCreateInvoiceBody,
  mapMonobankStatus,
  monobankInvoiceSchema,
  toProviderUpdate,
  verifyMonobankSignature,
} from './monobank-core';

// Тестова пара ключів у форматі monobank: публічний ключ — base64 від PEM.
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicKeyBase64 = Buffer.from(publicKey.export({ type: 'spki', format: 'pem' })).toString('base64');
const sign = (body: string) => createSign('SHA256').update(body).sign(privateKey).toString('base64');

const webhookBody = JSON.stringify({
  invoiceId: 'p2_9ZgpZVsl3',
  status: 'success',
  amount: 2_850_000,
  ccy: 980,
  finalAmount: 2_850_000,
  createdDate: '2026-11-16T10:00:00Z',
  modifiedDate: '2026-11-16T10:01:30Z',
  reference: 'invoice-14',
});

describe('verifyMonobankSignature', () => {
  it('приймає підпис над сирим тілом', () => {
    expect(verifyMonobankSignature(webhookBody, sign(webhookBody), publicKeyBase64)).toBe(true);
  });

  it('відхиляє змінене тіло, чужий ключ і відсутній підпис', () => {
    const signature = sign(webhookBody);
    expect(verifyMonobankSignature(webhookBody.replace('2850000', '100'), signature, publicKeyBase64)).toBe(false);
    const other = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).publicKey;
    const otherBase64 = Buffer.from(other.export({ type: 'spki', format: 'pem' })).toString('base64');
    expect(verifyMonobankSignature(webhookBody, signature, otherBase64)).toBe(false);
    expect(verifyMonobankSignature(webhookBody, null, publicKeyBase64)).toBe(false);
    expect(verifyMonobankSignature(webhookBody, 'not-base64-signature', publicKeyBase64)).toBe(false);
  });
});

describe('toProviderUpdate', () => {
  it('нормалізує подію: статус, ключ ідемпотентності, час', () => {
    const update = toProviderUpdate(monobankInvoiceSchema.parse(JSON.parse(webhookBody)));
    expect(update).toMatchObject({
      provider: 'MONOBANK',
      externalId: 'p2_9ZgpZVsl3',
      status: 'SUCCEEDED',
      amount: 2_850_000,
      currency: 'UAH',
      dedupeKey: 'p2_9ZgpZVsl3:success:2026-11-16T10:01:30Z',
    });
    expect(update.occurredAt.toISOString()).toBe('2026-11-16T10:01:30.000Z');
  });

  it('відхиляє не гривню', () => {
    const invoice = monobankInvoiceSchema.parse({ ...JSON.parse(webhookBody), ccy: 840 });
    expect(() => toProviderUpdate(invoice)).toThrow('Unsupported');
  });

  it('причина відмови — з failureReason або errCode', () => {
    const failed = monobankInvoiceSchema.parse({ ...JSON.parse(webhookBody), status: 'failure', errCode: '59' });
    expect(toProviderUpdate(failed)).toMatchObject({ status: 'FAILED', failureReason: 'Код помилки 59' });
  });
});

describe('mapMonobankStatus', () => {
  it.each([
    ['created', 'PENDING'],
    ['processing', 'PENDING'],
    ['hold', 'PENDING'],
    ['success', 'SUCCEEDED'],
    ['failure', 'FAILED'],
    ['expired', 'EXPIRED'],
    ['reversed', 'REFUNDED'],
  ] as const)('%s → %s', (status, expected) => {
    expect(mapMonobankStatus(status)).toBe(expected);
  });
});

describe('buildCreateInvoiceBody', () => {
  it('копійки, гривня, термін дії й вебхук лише за наявності публічного URL', () => {
    const base = { paymentId: 'pay_1', amount: 2_850_000, reference: 'invoice-14', purpose: 'Оплата', redirectUrl: 'http://localhost:3000/i/t?payment=pay_1' };
    expect(buildCreateInvoiceBody(base)).toEqual({
      amount: 2_850_000,
      ccy: 980,
      merchantPaymInfo: { reference: 'invoice-14', destination: 'Оплата' },
      redirectUrl: base.redirectUrl,
      validity: 3600,
    });
    expect(buildCreateInvoiceBody({ ...base, webhookUrl: 'https://x.trycloudflare.com/api/webhooks/monobank' })).toHaveProperty(
      'webHookUrl',
    );
  });
});
