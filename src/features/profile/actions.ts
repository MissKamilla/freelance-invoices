'use server';
import { revalidatePath } from 'next/cache';
import { fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { profileSchema } from './schema';
import { saveProfile } from './service';

export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  await saveProfile(user.id, parsed.data);
  revalidatePath('/', 'layout');
  return ok();
}
