import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(100);

/**
 * Аргументи Server Action — недовірений ввід з HTTP. Без перевірки `undefined` потрапить у Prisma
 * як «без фільтра»: `where: { id: undefined, userId }` зачепить УСІ записи користувача.
 */
export function parseIdArg(value: unknown): string | null {
  const parsed = idSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseBooleanArg(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export const INVALID_REQUEST = 'Некоректний запит';
