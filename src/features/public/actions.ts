'use server';
import { parseIdArg } from '@/lib/action-args';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * Позначка «клієнт переглянув». Викликається з браузера (useEffect), тому прев'ю посилань
 * у месенджерах, які не виконують JS, перегляд не фіксують. Перегляд власником не враховується.
 */
export async function markInvoiceViewedAction(tokenArg: unknown): Promise<void> {
  const token = parseIdArg(tokenArg);
  if (!token) return;
  const invoice = await db.invoice.findFirst({
    where: { publicToken: token, status: 'SENT', viewedAt: null },
    select: { id: true, userId: true },
  });
  if (!invoice) return;

  const session = await getSession();
  if (session?.user.id === invoice.userId) return;

  await db.$transaction(async (tx) => {
    const { count } = await tx.invoice.updateMany({
      where: { id: invoice.id, viewedAt: null },
      data: { viewedAt: new Date() },
    });
    if (count === 1) await tx.invoiceEvent.create({ data: { invoiceId: invoice.id, type: 'VIEWED' } });
  });
}
