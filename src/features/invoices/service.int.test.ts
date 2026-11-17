import { describe, expect, it } from 'vitest';
import { createDraftInvoice, createFreelancer } from '@/test/factories';
import { db } from '@/lib/db';
import { cancelInvoice, issueInvoice, markInvoicePaidManually } from './service';

describe('issueInvoice', () => {
  it('паралельне виставлення: номери унікальні й без пропусків', async () => {
    const { userId, clientId } = await createFreelancer();
    const drafts = await Promise.all(Array.from({ length: 6 }, () => createDraftInvoice(userId, clientId)));

    const results = await Promise.all(drafts.map((d) => issueInvoice(userId, d.id)));

    expect(results.map((r) => r.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(await db.businessProfile.findUnique({ where: { userId } })).toMatchObject({ nextInvoiceNumber: 7 });
  });

  it('повторне виставлення того самого рахунку не витрачає номер', async () => {
    const { userId, clientId } = await createFreelancer();
    const draft = await createDraftInvoice(userId, clientId);

    const [a, b] = await Promise.allSettled([issueInvoice(userId, draft.id), issueInvoice(userId, draft.id)]);

    expect([a.status, b.status].sort()).toEqual(['fulfilled', 'rejected']);
    expect(await db.businessProfile.findUnique({ where: { userId } })).toMatchObject({ nextInvoiceNumber: 2 });
  });

  it('знімок реквізитів не змінюється після редагування профілю', async () => {
    const { userId, clientId } = await createFreelancer();
    const draft = await createDraftInvoice(userId, clientId);
    await issueInvoice(userId, draft.id);

    await db.businessProfile.update({ where: { userId }, data: { iban: 'UA743052990000026007233566001' } });

    const issued = await db.invoice.findUniqueOrThrow({ where: { id: draft.id } });
    expect(issued.sellerSnapshot).toMatchObject({ iban: 'UA573220010000026007233566001' });
  });

  it('чужий користувач не може виставити рахунок', async () => {
    const owner = await createFreelancer();
    const stranger = await createFreelancer();
    const draft = await createDraftInvoice(owner.userId, owner.clientId);

    await expect(issueInvoice(stranger.userId, draft.id)).rejects.toThrow('Рахунок не знайдено');
  });
});

describe('cancel / manual payment', () => {
  it('скасування переводить PENDING-платежі в EXPIRED', async () => {
    const { userId, clientId } = await createFreelancer();
    const draft = await createDraftInvoice(userId, clientId);
    await issueInvoice(userId, draft.id);
    const pending = await db.payment.create({ data: { invoiceId: draft.id, provider: 'MOCK', amount: draft.total } });

    await cancelInvoice(userId, draft.id);

    expect(await db.payment.findUnique({ where: { id: pending.id } })).toMatchObject({ status: 'EXPIRED' });
  });

  it('ручна позначка переводить PENDING у EXPIRED і повертає їх для скасування в провайдера', async () => {
    const { userId, clientId } = await createFreelancer();
    const draft = await createDraftInvoice(userId, clientId);
    await issueInvoice(userId, draft.id);
    const pending = await db.payment.create({
      data: { invoiceId: draft.id, provider: 'MOCK', amount: draft.total, externalId: `mock_${draft.id}` },
    });

    const { expiredPayments } = await markInvoicePaidManually(userId, draft.id);

    expect(expiredPayments).toEqual([{ provider: 'MOCK', externalId: `mock_${draft.id}` }]);
    expect(await db.payment.findUnique({ where: { id: pending.id } })).toMatchObject({ status: 'EXPIRED' });
  });

  it('оплачений рахунок не можна скасувати', async () => {
    const { userId, clientId } = await createFreelancer();
    const draft = await createDraftInvoice(userId, clientId);
    await issueInvoice(userId, draft.id);
    await markInvoicePaidManually(userId, draft.id);

    await expect(cancelInvoice(userId, draft.id)).rejects.toThrow('неоплачений');
  });
});
