'use server';
import { revalidatePath } from 'next/cache';
import { INVALID_REQUEST, parseIdArg } from '@/lib/action-args';
import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { sendInvoiceIssuedEmail, sendInvoicePaidEmails, sendReminderEmail } from '@/features/notifications/email';
import { invoiceCancelled, invoiceIssued, invoicePaid, reminderRequested } from '@/inngest/client';
import { dispatch } from '@/inngest/dispatch';
import { cancelProviderCheckouts } from '@/features/payments/service';
import { InvoiceError } from './errors';
import { getInvoice } from './queries';
import { invoiceDraftSchema } from './schema';
import {
  cancelInvoice,
  createDraft,
  deleteDraft,
  duplicateInvoice,
  issueInvoice,
  markInvoicePaidManually,
  updateDraft,
} from './service';

async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof InvoiceError) return fail(error.message);
    throw error;
  }
}

export async function saveInvoiceDraftAction(input: unknown, idArg?: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const id = idArg === undefined ? undefined : parseIdArg(idArg);
  if (id === null) return fail(INVALID_REQUEST);
  const parsed = invoiceDraftSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  return guard(async () => {
    const invoiceId = id ?? (await createDraft(user.id, parsed.data)).id;
    if (id) await updateDraft(user.id, id, parsed.data);
    revalidatePath('/invoices');
    return ok({ id: invoiceId });
  });
}

/** Навігацію після видалення/дублювання робить клієнт: redirect() у дії відхиляє проміс і ховає результат. */
export async function deleteDraftAction(idArg: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = parseIdArg(idArg);
  if (!id) return fail(INVALID_REQUEST);
  return guard(async () => {
    await deleteDraft(user.id, id);
    revalidatePath('/invoices');
    return ok();
  });
}

export async function issueInvoiceAction(idArg: unknown): Promise<ActionResult<{ number: number }>> {
  const user = await requireUser();
  const id = parseIdArg(idArg);
  if (!id) return fail(INVALID_REQUEST);
  return guard(async () => {
    const { number } = await issueInvoice(user.id, id);
    await dispatch(invoiceIssued.create({ invoiceId: id }), () => sendInvoiceIssuedEmail(id));
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return ok({ number });
  });
}

export async function cancelInvoiceAction(idArg: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = parseIdArg(idArg);
  if (!id) return fail(INVALID_REQUEST);
  return guard(async () => {
    const { expiredPayments } = await cancelInvoice(user.id, id);
    await cancelProviderCheckouts(expiredPayments);
    await dispatch(invoiceCancelled.create({ invoiceId: id }));
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return ok();
  });
}

export async function markInvoicePaidAction(idArg: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = parseIdArg(idArg);
  if (!id) return fail(INVALID_REQUEST);
  return guard(async () => {
    const { expiredPayments } = await markInvoicePaidManually(user.id, id);
    await cancelProviderCheckouts(expiredPayments);
    await dispatch(invoicePaid.create({ invoiceId: id, notifyFreelancer: false }), () =>
      sendInvoicePaidEmails(id, { notifyFreelancer: false }),
    );
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return ok();
  });
}

export async function duplicateInvoiceAction(idArg: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const id = parseIdArg(idArg);
  if (!id) return fail(INVALID_REQUEST);
  return guard(async () => {
    const copy = await duplicateInvoice(user.id, id);
    revalidatePath('/invoices');
    return ok({ id: copy.id });
  });
}

/** Між ручними нагадуваннями — не менше години: кнопка не має перетворюватися на спам клієнту. */
const REMINDER_COOLDOWN_MS = 60 * 60 * 1000;

/** Ручне «Нагадати» — лише для виставленого неоплаченого рахунку. */
export async function remindInvoiceAction(idArg: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = parseIdArg(idArg);
  if (!id) return fail(INVALID_REQUEST);
  const invoice = await getInvoice(user.id, id);
  if (!invoice || invoice.status !== 'SENT') return fail('Нагадати можна лише про виставлений неоплачений рахунок');
  const lastReminder = invoice.events.findLast((e) => e.type === 'REMINDER_SENT');
  if (lastReminder && Date.now() - lastReminder.createdAt.getTime() < REMINDER_COOLDOWN_MS) {
    return fail('Нагадування вже надсилали менше години тому');
  }

  await dispatch(reminderRequested.create({ invoiceId: id }), () => sendReminderEmail(id, 'manual'));
  revalidatePath(`/invoices/${id}`);
  return ok();
}
