import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

/** Сесія поточного запиту (кешується в межах одного рендеру). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * Повертає користувача або перенаправляє на вхід.
 * Викликати в кожній приватній сторінці й Server Action — proxy.ts лише UX-редирект.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session.user;
}
