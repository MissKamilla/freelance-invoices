import { nanoid } from 'nanoid';
import { describe, expect, it } from 'vitest';
import { createPendingPayment } from '@/test/factories';
import { db } from '@/lib/db';
import type { ProviderPaymentUpdate } from './providers/types';
import { applyPaymentUpdate, startPayment } from './service';

function successEvent(externalId: string, overrides: Partial<ProviderPaymentUpdate> = {}): ProviderPaymentUpdate {
  return {
    provider: 'MOCK',
    dedupeKey: `evt_${nanoid(10)}`,
    externalId,
    status: 'SUCCEEDED',
    amount: 2_850_000,
    currency: 'UAH',
    occurredAt: new Date(),
    raw: {},
    ...overrides,
  };
}

const eventsOf = async (invoiceId: string) =>
  (await db.invoiceEvent.findMany({ where: { invoiceId }, orderBy: { createdAt: 'asc' } })).map((e) => e.type);

describe('applyPaymentUpdate', () => {
  it('успішний вебхук: платіж SUCCEEDED, рахунок PAID, подія PAID', async () => {
    const { invoice, payment } = await createPendingPayment();
    const result = await applyPaymentUpdate(successEvent(payment.externalId!));

    expect(result.outcome).toBe('paid');
    expect(await db.invoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: 'PAID' });
    expect(await db.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: 'SUCCEEDED' });
    expect(await eventsOf(invoice.id)).toEqual(['PAID']);
  });

  it('повторна доставка тієї ж події нічого не змінює', async () => {
    const { invoice, payment } = await createPendingPayment();
    const event = successEvent(payment.externalId!);

    await applyPaymentUpdate(event);
    expect((await applyPaymentUpdate(event)).outcome).toBe('duplicate');
    expect(await eventsOf(invoice.id)).toEqual(['PAID']);
  });

  it('5 паралельних доставок однієї події: рахунок оплачується рівно один раз', async () => {
    const { invoice, payment } = await createPendingPayment();
    const event = successEvent(payment.externalId!);

    const results = await Promise.all(Array.from({ length: 5 }, () => applyPaymentUpdate(event)));

    expect(results.map((r) => r.outcome).sort()).toEqual(['duplicate', 'duplicate', 'duplicate', 'duplicate', 'paid']);
    expect(await eventsOf(invoice.id)).toEqual(['PAID']);
    expect(await db.webhookEvent.count({ where: { dedupeKey: event.dedupeKey } })).toBe(1);
  });

  it('сума не збігається: рахунок лишається SENT, подія AMOUNT_MISMATCH', async () => {
    const { invoice, payment } = await createPendingPayment();
    const result = await applyPaymentUpdate(successEvent(payment.externalId!, { amount: 2_849_999 }));

    expect(result.outcome).toBe('amount_mismatch');
    expect(await db.invoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: 'SENT' });
    expect(await eventsOf(invoice.id)).toEqual(['AMOUNT_MISMATCH']);
  });

  it('друга успішна оплата вже оплаченого рахунку → NEEDS_REFUND', async () => {
    const { invoice, payment } = await createPendingPayment();
    await applyPaymentUpdate(successEvent(payment.externalId!));

    const second = await db.payment.create({
      data: { invoiceId: invoice.id, provider: 'MOCK', amount: payment.amount, externalId: `mock_${nanoid(10)}` },
    });
    const result = await applyPaymentUpdate(successEvent(second.externalId!));

    expect(result.outcome).toBe('needs_refund');
    expect(await eventsOf(invoice.id)).toEqual(['PAID', 'NEEDS_REFUND']);
  });

  it('застаріла подія відкидається', async () => {
    const { payment } = await createPendingPayment();
    const later = new Date();
    await applyPaymentUpdate(successEvent(payment.externalId!, { status: 'FAILED', occurredAt: later }));

    const stale = await applyPaymentUpdate(
      successEvent(payment.externalId!, { occurredAt: new Date(later.getTime() - 60_000) }),
    );
    expect(stale.outcome).toBe('stale');
    expect(await db.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: 'FAILED' });
  });

  it('подія для невідомого платежу підтверджується (200), але нічого не змінює', async () => {
    expect((await applyPaymentUpdate(successEvent('mock_unknown'))).outcome).toBe('unknown_payment');
  });
});

describe('applyPaymentUpdate: паралельні різні події одного платежу', () => {
  // Різні dedupeKey — дедуплікація не рятує; рішення має прийматися за станом платежу ПІСЛЯ блокування рахунку.
  it('дві успішні події: рахунок оплачено один раз, без хибного NEEDS_REFUND', async () => {
    const { invoice, payment } = await createPendingPayment();
    const now = Date.now();

    await Promise.all([
      applyPaymentUpdate(successEvent(payment.externalId!, { occurredAt: new Date(now) })),
      applyPaymentUpdate(successEvent(payment.externalId!, { occurredAt: new Date(now + 1_000) })),
    ]);

    expect(await eventsOf(invoice.id)).toEqual(['PAID']);
    expect(await db.invoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: 'PAID' });
    expect(await db.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: 'SUCCEEDED' });
  });

  it('відмова й пізніший успіх: оплачений рахунок не лишається з платежем FAILED', async () => {
    const { invoice, payment } = await createPendingPayment();
    const now = Date.now();

    await Promise.all([
      applyPaymentUpdate(successEvent(payment.externalId!, { occurredAt: new Date(now + 1_000) })),
      applyPaymentUpdate(successEvent(payment.externalId!, { status: 'FAILED', amount: 0, occurredAt: new Date(now) })),
    ]);

    expect(await db.invoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: 'PAID' });
    expect(await db.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: 'SUCCEEDED' });
    expect(await eventsOf(invoice.id)).not.toContain('NEEDS_REFUND');
  });
});

describe('startPayment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete mockProvider.cancel;
  });

  it('повторно використовує живий PENDING-платіж і не створює дублікатів', async () => {
    const { invoice } = await createPendingPayment();
    await db.payment.deleteMany({ where: { invoiceId: invoice.id } });

    const first = await startPayment(invoice.publicToken!);
    const second = await startPayment(invoice.publicToken!);

    expect(second).toBe(first);
    expect(await db.payment.count({ where: { invoiceId: invoice.id } })).toBe(1);
  });

  it('не дає оплатити вже оплачений рахунок', async () => {
    const { invoice, payment } = await createPendingPayment();
    await applyPaymentUpdate(successEvent(payment.externalId!));
    await expect(startPayment(invoice.publicToken!)).rejects.toThrow('не можна оплатити');
  });
});
