import { addDays, atKyivTime } from './dates';

export type ReminderKind = 'before_due' | 'overdue' | 'manual';

/**
 * Коли нагадувати: о 10:00 за Києвом за день до терміну і наступного дня після нього.
 * Демо-режим стискає дні до хвилин, щоб показати нагадування на дзвінку.
 * Нагадування, час якого вже минув, пропускається (інакше sleepUntil спрацює одразу).
 */
export function planReminders({
  dueDate,
  issuedAt,
  now,
  demo,
}: {
  dueDate: Date;
  issuedAt: Date;
  now: Date;
  demo: boolean;
}): { beforeDue: Date | null; overdue: Date } {
  const beforeDue = demo ? new Date(issuedAt.getTime() + 60_000) : atKyivTime(addDays(dueDate, -1), 10);
  const overdue = demo ? new Date(issuedAt.getTime() + 120_000) : atKyivTime(addDays(dueDate, 1), 10);
  return { beforeDue: beforeDue.getTime() > now.getTime() ? beforeDue : null, overdue };
}
