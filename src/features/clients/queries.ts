import 'server-only';
import { db } from '@/lib/db';

export function listClients(userId: string, { archived = false } = {}) {
  return db.client.findMany({
    where: { userId, archivedAt: archived ? { not: null } : null },
    orderBy: { name: 'asc' },
    include: { _count: { select: { invoices: true } } },
  });
}

export type ClientListItem = Awaited<ReturnType<typeof listClients>>[number];
