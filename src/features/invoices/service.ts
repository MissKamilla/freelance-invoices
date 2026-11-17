import 'server-only';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { addDays, fromIsoDate, todayKyiv } from '@/lib/dates';
import { calcLineAmount } from '@/lib/invoice-calc';
import { buildPaymentPurpose } from '@/lib/payment-purpose';
import { InvoiceError } from './errors';
import type { InvoiceDraftData } from './schema';
import type { ClientSnapshot, SellerSnapshot } from './snapshot';

function toDraftRows(data: InvoiceDraftData) {
  const items = data.items.map((item, index) => ({
    position: index + 1,
    description: item.description,
    unit: item.unit,
    quantityHundredths: item.quantity,
    unitPrice: item.unitPrice,
    amount: calcLineAmount(item.quantity, item.unitPrice),
  }));
  return {
    fields: {
      clientId: data.clientId,
      dueDate: fromIsoDate(data.dueDate),
      contractRef: data.contractRef || null,
      notes: data.notes || null,
      total: items.reduce((sum, item) => sum + item.amount, 0),
    },
    items,
  };
}

export async function createDraft(userId: string, data: InvoiceDraftData) {
  const client = await db.client.findFirst({ where: { id: data.clientId, userId, archivedAt: null } });
  if (!client) throw new InvoiceError('Клієнта не знайдено');

  const { fields, items } = toDraftRows(data);
  return db.invoice.create({
    data: { userId, ...fields, items: { create: items }, events: { create: { type: 'CREATED' } } },
    select: { id: true },
  });
}

export async function updateDraft(userId: string, id: string, data: InvoiceDraftData) {
  const client = await db.client.findFirst({ where: { id: data.clientId, userId } });
  if (!client) throw new InvoiceError('Клієнта не знайдено');

  const { fields, items } = toDraftRows(data);
  await db.$transaction(async (tx) => {
    // UPDATE з умовою status = DRAFT блокує рядок до кінця транзакції — паралельне виставлення чекатиме.
    const { count } = await tx.invoice.updateMany({ where: { id, userId, status: 'DRAFT' }, data: fields });
    if (count === 0) throw new InvoiceError('Чернетку не знайдено або рахунок уже виставлено');
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.invoiceItem.createMany({ data: items.map((item) => ({ ...item, invoiceId: id })) });
  });
}

export async function deleteDraft(userId: string, id: string) {
  const { count } = await db.invoice.deleteMany({ where: { id, userId, status: 'DRAFT' } });
  if (count === 0) throw new InvoiceError('Видалити можна лише власну чернетку');
}

// ─── Життєвий цикл виставленого рахунку ─────────────────────────────────────

/**
 * Виставлення — одна транзакція:
 * атомарний інкремент номера (рядок профілю блокується до коміту), знімки реквізитів,
 * публічний токен, статус SENT і подія ISSUED. Якщо рахунок паралельно вже виставили —
 * updateMany поверне 0, транзакція відкотиться разом з інкрементом, тож номери йдуть без пропусків.
 */
export async function issueInvoice(userId: string, id: string, now: Date = new Date()) {
  return db.$transaction(async (tx) => {
    // Блокуємо рядок до читання: паралельне збереження чернетки з іншої вкладки дочекається коміту,
    // і знімок клієнта/позицій відповідатиме тому, що реально виставлено.
    await tx.$queryRaw`SELECT id FROM "invoice" WHERE id = ${id} FOR UPDATE`;
    const invoice = await tx.invoice.findFirst({
      where: { id, userId },
      include: { client: true, _count: { select: { items: true } } },
    });
    if (!invoice) throw new InvoiceError('Рахунок не знайдено');
    if (invoice.status !== 'DRAFT') throw new InvoiceError('Рахунок уже виставлено');
    if (invoice._count.items === 0 || invoice.total <= 0) throw new InvoiceError('Додайте хоча б одну позицію');

    const today = todayKyiv(now);
    if (invoice.dueDate.getTime() < today.getTime()) {
      throw new InvoiceError('Термін оплати вже минув — змініть дату в чернетці');
    }

    const profile = await tx.businessProfile.findUnique({ where: { userId } });
    if (!profile) throw new InvoiceError('Спершу заповніть реквізити ФОП у налаштуваннях');

    const { nextInvoiceNumber } = await tx.businessProfile.update({
      where: { userId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { nextInvoiceNumber: true },
    });
    const number = nextInvoiceNumber - 1;

    const seller: SellerSnapshot = {
      legalName: profile.legalName,
      taxId: profile.taxId,
      iban: profile.iban,
      bankName: profile.bankName,
      address: profile.address,
      phone: profile.phone,
      taxNote: profile.taxNote,
    };
    const client: ClientSnapshot = {
      name: invoice.client.name,
      taxId: invoice.client.taxId,
      email: invoice.client.email,
      address: invoice.client.address,
    };

    const { count } = await tx.invoice.updateMany({
      where: { id, userId, status: 'DRAFT' },
      data: {
        status: 'SENT',
        number,
        issueDate: today,
        issuedAt: now,
        paymentPurpose: buildPaymentPurpose({ number, issueDate: today }),
        publicToken: nanoid(24),
        sellerSnapshot: seller,
        clientSnapshot: client,
      },
    });
    if (count === 0) throw new InvoiceError('Рахунок уже виставлено');

    await tx.invoiceEvent.create({ data: { invoiceId: id, type: 'ISSUED', meta: { number } } });
    return { id, number };
  });
}

export async function cancelInvoice(userId: string, id: string, now: Date = new Date()) {
  return db.$transaction(async (tx) => {
    const pending = await tx.payment.findMany({
      where: { invoiceId: id, status: 'PENDING', invoice: { userId } },
      select: { provider: true, externalId: true },
    });
    const { count } = await tx.invoice.updateMany({
      where: { id, userId, status: 'SENT' },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    if (count === 0) throw new InvoiceError('Скасувати можна лише виставлений неоплачений рахунок');
    await tx.payment.updateMany({ where: { invoiceId: id, status: 'PENDING' }, data: { status: 'EXPIRED' } });
    await tx.invoiceEvent.create({ data: { invoiceId: id, type: 'CANCELLED' } });
    // Незавершені checkout-и треба закрити й у провайдера — після коміту, у дії.
    return { expiredPayments: pending };
  });
}

/** Клієнт заплатив переказом на IBAN (QR / реквізити) — фрилансер позначає вручну. */
export async function markInvoicePaidManually(userId: string, id: string, now: Date = new Date()) {
  await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id, userId }, select: { total: true, currency: true } });
    const { count } = await tx.invoice.updateMany({
      where: { id, userId, status: 'SENT' },
      data: { status: 'PAID', paidAt: now },
    });
    if (!invoice || count === 0) throw new InvoiceError('Позначити оплаченим можна лише виставлений рахунок');

    await tx.payment.updateMany({ where: { invoiceId: id, status: 'PENDING' }, data: { status: 'EXPIRED' } });
    await tx.payment.create({
      data: {
        invoiceId: id,
        provider: 'MANUAL',
        status: 'SUCCEEDED',
        amount: invoice.total,
        currency: invoice.currency,
        paidAt: now,
      },
    });
    await tx.invoiceEvent.create({ data: { invoiceId: id, type: 'PAID', meta: { provider: 'MANUAL' } } });
  });
}

/** Нова чернетка з тим самим клієнтом і позиціями — для щомісячних рахунків. */
export async function duplicateInvoice(userId: string, id: string, now: Date = new Date()) {
  const source = await db.invoice.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { position: 'asc' } }, client: { select: { archivedAt: true } } },
  });
  if (!source) throw new InvoiceError('Рахунок не знайдено');
  if (source.client.archivedAt) throw new InvoiceError('Клієнт в архіві — спершу відновіть його');

  const profile = await db.businessProfile.findUnique({ where: { userId }, select: { defaultDueDays: true } });
  const dueDate = addDays(todayKyiv(now), profile?.defaultDueDays ?? 7);

  return db.invoice.create({
    data: {
      userId,
      clientId: source.clientId,
      dueDate,
      contractRef: source.contractRef,
      notes: source.notes,
      total: source.total,
      items: {
        create: source.items.map(({ position, description, unit, quantityHundredths, unitPrice, amount }) => ({
          position,
          description,
          unit,
          quantityHundredths,
          unitPrice,
          amount,
        })),
      },
      events: { create: { type: 'CREATED', meta: { duplicatedFrom: source.number } } },
    },
    select: { id: true },
  });
}
