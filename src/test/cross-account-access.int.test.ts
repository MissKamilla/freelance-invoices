import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/action-result';

// Server Actions викликаються так само, як з HTTP: сесію підміняємо на потрібного користувача, а побічні ефекти
// поза БД (revalidatePath Next.js, події Inngest з листами) вимикаємо — перевіряємо лише доступ до даних.
const session = vi.hoisted(() => ({ userId: '' }));
vi.mock('@/lib/session', () => ({
  requireUser: async () => ({ id: session.userId, name: 'Тест', email: `${session.userId}@test.local` }),
  getSession: async () => ({ user: { id: session.userId } }),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/inngest/dispatch', () => ({ dispatch: async () => {} }));

const { db } = await import('@/lib/db');
const { todayKyiv, addDays, toIsoDate } = await import('@/lib/dates');
const { createDraftInvoice, createFreelancer } = await import('@/test/factories');
const { saveClientAction, setClientArchivedAction } = await import('@/features/clients/actions');
const { listClients } = await import('@/features/clients/queries');
const invoiceActions = await import('@/features/invoices/actions');
const { getInvoice, listClientOptions, listInvoices } = await import('@/features/invoices/queries');
const { issueInvoice } = await import('@/features/invoices/service');

type Account = { userId: string; clientId: string; draftId: string; sentId: string };

async function account(): Promise<Account> {
  const { userId, clientId } = await createFreelancer();
  const draft = await createDraftInvoice(userId, clientId);
  const toIssue = await createDraftInvoice(userId, clientId);
  await issueInvoice(userId, toIssue.id);
  return { userId, clientId, draftId: draft.id, sentId: toIssue.id };
}

const draftInput = (clientId: string) => ({
  clientId,
  dueDate: toIsoDate(addDays(todayKyiv(), 7)),
  contractRef: '',
  notes: '',
  items: [{ description: 'Послуга', unit: 'послуга', quantity: '1', unitPrice: '1000' }],
});

/** Усе, що належить A, і кількість рахунків B — до й після спроби доступу мають збігатися. */
async function snapshot(a: Account, b: Account) {
  const [clients, invoices, profile, invoicesOfB] = await Promise.all([
    db.client.findMany({ where: { userId: a.userId }, orderBy: { id: 'asc' } }),
    db.invoice.findMany({
      where: { userId: a.userId },
      orderBy: { id: 'asc' },
      include: { items: { orderBy: { position: 'asc' } }, payments: true, events: { orderBy: { createdAt: 'asc' } } },
    }),
    db.businessProfile.findUnique({ where: { userId: a.userId }, select: { nextInvoiceNumber: true } }),
    db.invoice.findMany({ where: { userId: b.userId }, select: { id: true, status: true, clientId: true } }),
  ]);
  return { clients, invoices, profile, invoicesOfB };
}

let a: Account;
let b: Account;

beforeEach(async () => {
  a = await account();
  b = await account();
  session.userId = b.userId;
});

describe('доступ між акаунтами: B не може змінити дані A через Server Actions', () => {
  const attacks: [string, () => Promise<ActionResult<unknown>>][] = [
    [
      'змінити клієнта A',
      () =>
        saveClientAction({ name: 'Зламано', taxId: '', email: 'evil@test.local', address: '', notes: '' }, a.clientId),
    ],
    ['архівувати клієнта A', () => setClientArchivedAction(a.clientId, true)],
    ['створити рахунок на клієнта A', () => invoiceActions.saveInvoiceDraftAction(draftInput(a.clientId))],
    ['змінити чернетку A', () => invoiceActions.saveInvoiceDraftAction(draftInput(b.clientId), a.draftId)],
    ['видалити чернетку A', () => invoiceActions.deleteDraftAction(a.draftId)],
    ['виставити чернетку A', () => invoiceActions.issueInvoiceAction(a.draftId)],
    ['скасувати рахунок A', () => invoiceActions.cancelInvoiceAction(a.sentId)],
    ['позначити рахунок A оплаченим', () => invoiceActions.markInvoicePaidAction(a.sentId)],
    ['скопіювати рахунок A собі (дублювання)', () => invoiceActions.duplicateInvoiceAction(a.sentId)],
    ['надіслати нагадування клієнту A', () => invoiceActions.remindInvoiceAction(a.sentId)],
  ];

  it.each(attacks)('%s — відмова, дані A без змін', async (_, attack) => {
    const before = await snapshot(a, b);
    const result = await attack();
    expect(result.ok).toBe(false);
    expect(await snapshot(a, b)).toEqual(before);
  });

  it.each([
    ['без аргументу', undefined],
    ['порожній рядок', ''],
    ['null', null],
    ['число', 123],
    ['об’єкт з id', { id: 'x' }],
    ['масив з id', ['x']],
  ])('некоректний id (%s) не знімає фільтр і нічого не видаляє', async (_, arg) => {
    const before = await snapshot(a, b);
    const result = await invoiceActions.deleteDraftAction(arg);
    expect(result).toMatchObject({ ok: false, error: 'Некоректний запит' });
    expect(await snapshot(a, b)).toEqual(before);
  });
});

describe('доступ між акаунтами: B не бачить даних A', () => {
  it('рахунок і чернетка A для B не існують', async () => {
    expect(await getInvoice(b.userId, a.sentId)).toBeNull();
    expect(await getInvoice(b.userId, a.draftId)).toBeNull();
  });

  it('клієнт A не потрапляє у списки й вибір клієнта B', async () => {
    const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
    expect(ids(await listClients(b.userId))).not.toContain(a.clientId);
    expect(ids(await listClients(b.userId, { archived: true }))).not.toContain(a.clientId);
    expect(ids(await listClientOptions(b.userId, a.clientId))).not.toContain(a.clientId);
  });

  it('пошук і список рахунків B не містять рахунків A', async () => {
    const today = todayKyiv();
    const ids = (await listInvoices(b.userId, { filter: 'all', q: '', today })).map((r) => r.id);
    expect(ids).not.toContain(a.sentId);
    expect(ids).not.toContain(a.draftId);
    expect(await listInvoices(b.userId, { filter: 'all', q: 'Клієнт', today })).not.toContainEqual(
      expect.objectContaining({ id: a.sentId }),
    );
  });
});

describe('контроль: власник виконує ті самі дії', () => {
  it('A змінює, дублює, нагадує, позначає оплаченим, видаляє й архівує своє', async () => {
    session.userId = a.userId;
    const results = [
      await saveClientAction(
        { name: 'ТОВ «Клієнт»', taxId: '', email: 'client@test.local', address: 'Київ', notes: '' },
        a.clientId,
      ),
      await invoiceActions.saveInvoiceDraftAction(draftInput(a.clientId), a.draftId),
      await invoiceActions.duplicateInvoiceAction(a.sentId),
      await invoiceActions.remindInvoiceAction(a.sentId),
      await invoiceActions.markInvoicePaidAction(a.sentId),
      await invoiceActions.deleteDraftAction(a.draftId),
      await setClientArchivedAction(a.clientId, true),
    ];
    expect(results.map((r) => r.ok)).toEqual(Array(results.length).fill(true));
    expect(await db.invoice.findUnique({ where: { id: a.sentId } })).toMatchObject({ status: 'PAID' });
  });
});
