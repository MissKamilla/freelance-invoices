'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAPIError } from 'better-auth/api';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { fail, fromZodError, type ActionResult } from '@/lib/action-result';
import { clientIp, createRateLimiter } from '@/lib/rate-limit';
import { DEMO_USER } from './demo';
import { signInSchema, signUpSchema } from './schema';

export type AuthFormState = ActionResult | null;

const authErrorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Невірний email або пароль',
  USER_ALREADY_EXISTS: 'Користувач з таким email вже існує',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Користувач з таким email вже існує',
  PASSWORD_TOO_SHORT: 'Пароль занадто короткий',
  INVALID_EMAIL: 'Некоректний email',
};

// Server Actions викликають auth.api напряму — HTTP rate limit Better Auth їх не бачить, тому обмежуємо самі.
// Лічильники в пам'яті процесу (один інстанс; Redis — наступний крок); IP із заголовків проксі — best effort.
const TOO_MANY_ATTEMPTS = 'Забагато спроб. Спробуйте пізніше';
const signInByEmail = createRateLimiter(10, 15 * 60 * 1000);
const signInByIp = createRateLimiter(30, 15 * 60 * 1000);
const signUpByIp = createRateLimiter(10, 60 * 60 * 1000);

function authErrorMessage(error: unknown): string {
  if (isAPIError(error)) {
    const code = error.body?.code;
    if (code && authErrorMessages[code]) return authErrorMessages[code];
  }
  console.error('[auth]', error);
  return 'Не вдалося виконати дію. Спробуйте ще раз.';
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const requestHeaders = await headers();
  if (!signInByIp.hit(clientIp(requestHeaders)) || !signInByEmail.hit(parsed.data.email.toLowerCase())) {
    return fail(TOO_MANY_ATTEMPTS);
  }

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: requestHeaders });
  } catch (error) {
    return fail(authErrorMessage(error));
  }
  redirect('/dashboard');
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const requestHeaders = await headers();
  if (!signUpByIp.hit(clientIp(requestHeaders))) return fail(TOO_MANY_ATTEMPTS);

  try {
    await auth.api.signUpEmail({ body: parsed.data, headers: requestHeaders });
  } catch (error) {
    return fail(authErrorMessage(error));
  }
  redirect('/settings?welcome=1');
}

/** Вхід у демо-акаунт; якщо seed не запускали — створює його. */
export async function demoSignInAction(): Promise<AuthFormState> {
  if (!env.DEMO_MODE) return fail('Демо-режим вимкнено');
  const requestHeaders = await headers();
  if (!signInByIp.hit(clientIp(requestHeaders))) return fail(TOO_MANY_ATTEMPTS);

  try {
    await auth.api.signInEmail({
      body: { email: DEMO_USER.email, password: DEMO_USER.password },
      headers: requestHeaders,
    });
  } catch (error) {
    if (!isAPIError(error) || error.body?.code !== 'INVALID_EMAIL_OR_PASSWORD') {
      return fail(authErrorMessage(error));
    }
    try {
      await auth.api.signUpEmail({ body: { ...DEMO_USER }, headers: requestHeaders });
    } catch (signUpError) {
      return fail(authErrorMessage(signUpError));
    }
  }
  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect('/login');
}
