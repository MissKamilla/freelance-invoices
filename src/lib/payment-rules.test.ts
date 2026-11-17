import { describe, expect, it } from 'vitest';
import { canPaymentTransition, decidePaymentUpdate } from './payment-rules';

const t0 = new Date('2026-11-16T10:00:00Z');
const t1 = new Date('2026-11-16T10:05:00Z');

const input = (overrides: {
  update?: Partial<Parameters<typeof decidePaymentUpdate>[0]['update']>;
  payment?: Partial<Parameters<typeof decidePaymentUpdate>[0]['payment']>;
  invoice?: Partial<Parameters<typeof decidePaymentUpdate>[0]['invoice']>;
}) => ({
  update: { status: 'SUCCEEDED' as const, amount: 2_850_000, currency: 'UAH' as const, occurredAt: t1, ...overrides.update },
  payment: { status: 'PENDING' as const, providerUpdatedAt: null, ...overrides.payment },
  invoice: { status: 'SENT' as const, total: 2_850_000, currency: 'UAH' as const, ...overrides.invoice },
});

describe('decidePaymentUpdate', () => {
  it('успіх на суму рахунку → рахунок оплачено', () => {
    expect(decidePaymentUpdate(input({}))).toEqual({
      outcome: 'paid',
      paymentStatus: 'SUCCEEDED',
      markInvoicePaid: true,
      event: 'PAID',
    });
  });

  it('сума не збігається → платіж фіксуємо, рахунок не чіпаємо', () => {
    const decision = decidePaymentUpdate(input({ update: { amount: 2_849_999 } }));
    expect(decision).toMatchObject({ outcome: 'amount_mismatch', paymentStatus: 'SUCCEEDED', markInvoicePaid: false });
    expect(decision.event).toBe('AMOUNT_MISMATCH');
  });

  it('повторна оплата вже оплаченого рахунку → потрібне повернення', () => {
    expect(decidePaymentUpdate(input({ invoice: { status: 'PAID' } }))).toMatchObject({
      outcome: 'needs_refund',
      markInvoicePaid: false,
      event: 'NEEDS_REFUND',
    });
  });

  it('оплата скасованого рахунку (платіж уже EXPIRED) → потрібне повернення', () => {
    expect(
      decidePaymentUpdate(input({ payment: { status: 'EXPIRED' }, invoice: { status: 'CANCELLED' } })),
    ).toMatchObject({ outcome: 'needs_refund', paymentStatus: 'SUCCEEDED' });
  });

  it('відмова банку → PAYMENT_FAILED, рахунок чекає далі', () => {
    expect(decidePaymentUpdate(input({ update: { status: 'FAILED' } }))).toMatchObject({
      outcome: 'failed',
      paymentStatus: 'FAILED',
      event: 'PAYMENT_FAILED',
    });
  });

  it('після відмови успішна повторна спроба приймається', () => {
    expect(decidePaymentUpdate(input({ payment: { status: 'FAILED' } }))).toMatchObject({ outcome: 'paid' });
  });

  it('повернення коштів після успіху', () => {
    expect(
      decidePaymentUpdate(input({ update: { status: 'REFUNDED' }, payment: { status: 'SUCCEEDED' } })),
    ).toMatchObject({ outcome: 'refunded', paymentStatus: 'REFUNDED', event: 'REFUNDED' });
  });

  it('застаріла подія (пізніша вже оброблена) → без змін', () => {
    expect(decidePaymentUpdate(input({ update: { occurredAt: t0 }, payment: { providerUpdatedAt: t1 } }))).toEqual({
      outcome: 'stale',
      paymentStatus: null,
      markInvoicePaid: false,
      event: null,
    });
  });

  it('статус не може піти назад: SUCCEEDED → FAILED ігнорується', () => {
    expect(decidePaymentUpdate(input({ update: { status: 'FAILED' }, payment: { status: 'SUCCEEDED' } }))).toMatchObject({
      outcome: 'ignored',
      paymentStatus: null,
    });
  });

  it('повторна доставка того самого статусу ігнорується', () => {
    expect(decidePaymentUpdate(input({ payment: { status: 'SUCCEEDED' } }))).toMatchObject({ outcome: 'ignored' });
  });
});

describe('canPaymentTransition', () => {
  it('REFUNDED — фінальний статус', () => {
    expect(canPaymentTransition('REFUNDED', 'SUCCEEDED')).toBe(false);
    expect(canPaymentTransition('PENDING', 'REFUNDED')).toBe(false);
  });
});
