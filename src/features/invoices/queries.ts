import 'server-only';
import { db } from '@/lib/db';

export function getInvoice(userId: string, id: string) {
  return db.invoice.findFirst({
    where: { id, userId },
    include: {
      client: true,
      items: { orderBy: { position: 'asc' } },
      events: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export type InvoiceWithRelations = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/** Активні клієнти для вибору в редакторі (+ поточний клієнт чернетки, навіть якщо архівований). */
export function listClientOptions(userId: string, includeClientId?: string) {
  return db.client.findMany({
    where: {
      userId,
      OR: [{ archivedAt: null }, ...(includeClientId ? [{ id: includeClientId }] : [])],
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}
