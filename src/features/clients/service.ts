import 'server-only';
import { db } from '@/lib/db';
import type { ClientData } from './schema';

function toRow(data: ClientData) {
  return {
    name: data.name,
    email: data.email,
    taxId: data.taxId || null,
    address: data.address || null,
    notes: data.notes || null,
  };
}

export function createClient(userId: string, data: ClientData) {
  return db.client.create({ data: { userId, ...toRow(data) } });
}

/** Оновлення лише власного клієнта: `where` містить userId (захист від IDOR). */
export async function updateClient(userId: string, id: string, data: ClientData) {
  const { count } = await db.client.updateMany({ where: { id, userId }, data: toRow(data) });
  return count === 1;
}

export async function setClientArchived(userId: string, id: string, archived: boolean) {
  const { count } = await db.client.updateMany({
    where: { id, userId },
    data: { archivedAt: archived ? new Date() : null },
  });
  return count === 1;
}
