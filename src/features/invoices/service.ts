import 'server-only';
import { db } from '@/lib/db';
import { fromIsoDate } from '@/lib/dates';
import { calcLineAmount } from '@/lib/invoice-calc';
import { InvoiceError } from './errors';
import type { InvoiceDraftData } from './schema';

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
