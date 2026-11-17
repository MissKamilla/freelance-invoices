import { randomUUID } from 'node:crypto';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { addDays, todayKyiv } from '@/lib/dates';

/** Користувач з реквізитами й клієнтом — ізольований набір даних для одного тесту. */
export async function createFreelancer() {
  const userId = randomUUID();
  await db.user.create({ data: { id: userId, name: 'Тест', email: `${userId}@test.local` } });
  await db.businessProfile.create({
    data: {
      userId,
      legalName: 'ФОП Тест Тестович',
      taxId: '1234567899',
      iban: 'UA573220010000026007233566001',
      bankName: 'Тест Банк',
      address: 'м. Київ',
      taxNote: 'Платник єдиного податку 3 групи, не платник ПДВ',
    },
  });
  const client = await db.client.create({ data: { userId, name: 'ТОВ «Клієнт»', email: 'client@test.local' } });
  return { userId, clientId: client.id };
}

export async function createDraftInvoice(userId: string, clientId: string, total = 2_850_000) {
  return db.invoice.create({
    data: {
      userId,
      clientId,
      dueDate: addDays(todayKyiv(), 7),
      total,
      items: {
        create: [
          {
            position: 1,
            description: 'Послуга',
            unit: 'послуга',
            quantityHundredths: 100,
            unitPrice: total,
            amount: total,
          },
        ],
      },
    },
  });
}

/** Виставлений рахунок з PENDING-платежем MOCK — як після натискання «Оплатити карткою». */
export async function createPendingPayment(total = 2_850_000) {
  const { userId, clientId } = await createFreelancer();
  const draft = await createDraftInvoice(userId, clientId, total);
  const invoice = await db.invoice.update({
    where: { id: draft.id },
    data: { status: 'SENT', number: 1, issueDate: todayKyiv(), publicToken: nanoid(24), paymentPurpose: 'Оплата' },
  });
  const payment = await db.payment.create({
    data: {
      invoiceId: invoice.id,
      provider: 'MOCK',
      amount: total,
      externalId: `mock_${nanoid(10)}`,
      expiresAt: addDays(new Date(), 1),
    },
  });
  return { userId, invoice, payment };
}
