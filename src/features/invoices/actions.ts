'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { InvoiceError } from './errors';
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

export async function saveInvoiceDraftAction(input: unknown, id?: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = invoiceDraftSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  return guard(async () => {
    const invoiceId = id ?? (await createDraft(user.id, parsed.data)).id;
    if (id) await updateDraft(user.id, id, parsed.data);
    revalidatePath('/invoices');
    return ok({ id: invoiceId });
  });
}

export async function deleteDraftAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await guard(async () => {
    await deleteDraft(user.id, id);
    return ok();
  });
  if (!result.ok) return result;
  revalidatePath('/invoices');
  redirect('/invoices');
}

export async function issueInvoiceAction(id: string): Promise<ActionResult<{ number: number }>> {
  const user = await requireUser();
  return guard(async () => {
    const { number } = await issueInvoice(user.id, id);
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return ok({ number });
  });
}

export async function cancelInvoiceAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  return guard(async () => {
    await cancelInvoice(user.id, id);
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return ok();
  });
}

export async function markInvoicePaidAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  return guard(async () => {
    await markInvoicePaidManually(user.id, id);
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return ok();
  });
}

export async function duplicateInvoiceAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await guard(async () => ok(await duplicateInvoice(user.id, id)));
  if (!result.ok) return result;
  revalidatePath('/invoices');
  redirect(`/invoices/${result.data.id}`);
}
