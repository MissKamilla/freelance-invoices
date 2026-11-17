'use server';
import { revalidatePath } from 'next/cache';
import { INVALID_REQUEST, parseBooleanArg, parseIdArg } from '@/lib/action-args';
import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { clientSchema } from './schema';
import { createClient, setClientArchived, updateClient } from './service';

export type SavedClient = { id: string; name: string };

export async function saveClientAction(input: unknown, idArg?: unknown): Promise<ActionResult<SavedClient>> {
  const user = await requireUser();
  const id = idArg === undefined ? undefined : parseIdArg(idArg);
  if (id === null) return fail(INVALID_REQUEST);
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

export async function setClientArchivedAction(idArg: unknown, archivedArg: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = parseIdArg(idArg);
  const archived = parseBooleanArg(archivedArg);
  if (!id || archived === null) return fail(INVALID_REQUEST);
  if (!(await setClientArchived(user.id, id, archived))) return fail('Клієнта не знайдено');
  revalidatePath('/clients');
  return ok();
}
