import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';

/**
 * Рахунок за публічним токеном. Чернетки й скасовані рахунки клієнту недоступні.
 * cache(): generateMetadata і сторінка викликають це в одному запиті — у БД іде один SELECT.
 */
export const getPublicInvoice = cache((token: string) =>
  db.invoice.findFirst({
    where: { publicToken: token, status: { in: ['SENT', 'PAID'] } },
    include: {
      items: { orderBy: { position: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  }),
);

export type PublicInvoice = NonNullable<Awaited<ReturnType<typeof getPublicInvoice>>>;

/** Платіж, з яким клієнт повернувся з платіжної сторінки (?payment=…), — лише цього рахунку. */
export function getReturnedPayment(invoiceId: string, paymentId: string) {
  return db.payment.findFirst({
    where: { id: paymentId, invoiceId },
    select: { status: true, failureReason: true },
  });
}
