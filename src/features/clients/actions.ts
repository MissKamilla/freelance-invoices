'use server';
import { revalidatePath } from 'next/cache';
import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { clientSchema } from './schema';
import { createClient, setClientArchived, updateClient } from './service';

export type SavedClient = { id: string; name: string };

export async function saveClientAction(input: unknown, id?: string): Promise<ActionResult<SavedClient>> {
  const user = await requireUser();
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  if (id) {
    if (!(await updateClient(user.id, id, parsed.data))) return fail('Клієнта не знайдено');
    revalidatePath('/clients');
    return ok({ id, name: parsed.data.name });
  }

  const client = await createClient(user.id, parsed.data);
  revalidatePath('/clients');
  return ok({ id: client.id, name: client.name });
}

export async function setClientArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await setClientArchived(user.id, id, archived))) return fail('Клієнта не знайдено');
  revalidatePath('/clients');
  return ok();
}
