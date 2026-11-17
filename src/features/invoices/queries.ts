import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
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

export const INVOICE_FILTERS = ['all', 'draft', 'unpaid', 'overdue', 'paid', 'cancelled'] as const;
export type InvoiceFilter = (typeof INVOICE_FILTERS)[number];

function filterWhere(filter: InvoiceFilter, today: Date): Prisma.InvoiceWhereInput {
  switch (filter) {
    case 'draft':
      return { status: 'DRAFT' };
    case 'unpaid':
      return { status: 'SENT' };
    case 'overdue':
      return { status: 'SENT', dueDate: { lt: today } };
    case 'paid':
      return { status: 'PAID' };
    case 'cancelled':
      return { status: 'CANCELLED' };
    default:
      return {};
  }
}

/** Номер рахунку — Postgres INT4: більше число в where дає помилку БД (P2020) замість «нічого не знайдено». */
const MAX_INVOICE_NUMBER = 2_147_483_647;

export function listInvoices(userId: string, { filter, q, today }: { filter: InvoiceFilter; q: string; today: Date }) {
  const query = q.trim().slice(0, 100);
  const parsed = /^\d{1,10}$/.test(query) ? Number(query) : null;
  const number = parsed !== null && parsed <= MAX_INVOICE_NUMBER ? parsed : null;
  return db.invoice.findMany({
    where: {
      userId,
      ...filterWhere(filter, today),
      ...(query && {
        OR: [
          ...(number !== null ? [{ number }] : []),
          { client: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      }),
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      viewedAt: true,
      total: true,
      client: { select: { name: true } },
    },
  });
}

/** Кількість рахунків для вкладок списку. */
export async function countInvoicesByFilter(userId: string, today: Date): Promise<Record<InvoiceFilter, number>> {
  const [groups, overdue] = await Promise.all([
    db.invoice.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
    db.invoice.count({ where: { userId, ...filterWhere('overdue', today) } }),
  ]);
  const byStatus = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  return {
    all: groups.reduce((sum, g) => sum + g._count._all, 0),
    draft: byStatus.DRAFT ?? 0,
    unpaid: byStatus.SENT ?? 0,
    overdue,
    paid: byStatus.PAID ?? 0,
    cancelled: byStatus.CANCELLED ?? 0,
  };
}
