'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { InvoiceError } from './errors';
import { invoiceDraftSchema } from './schema';
import { createDraft, deleteDraft, updateDraft } from './service';

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
