import 'server-only';
import { db } from '@/lib/db';

/** Рахунок за публічним токеном. Чернетки й скасовані рахунки клієнту недоступні. */
export function getPublicInvoice(token: string) {
  return db.invoice.findFirst({
    where: { publicToken: token, status: { in: ['SENT', 'PAID'] } },
    include: {
      items: { orderBy: { position: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
}

export type PublicInvoice = NonNullable<Awaited<ReturnType<typeof getPublicInvoice>>>;
