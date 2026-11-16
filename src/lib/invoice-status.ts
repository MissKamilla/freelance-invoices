import type { InvoiceStatus } from '@/generated/prisma/enums';

/** Статус для відображення: VIEWED і OVERDUE обчислюються, у БД не зберігаються. */
export type DisplayStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'OVERDUE' | 'PAID' | 'CANCELLED';

export type StatusChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'error';

export const DISPLAY_STATUS_META: Record<
  DisplayStatus,
  { label: string; color: StatusChipColor; variant: 'filled' | 'outlined' }
> = {
  DRAFT: { label: 'Чернетка', color: 'default', variant: 'filled' },
  SENT: { label: 'Виставлено', color: 'primary', variant: 'filled' },
  VIEWED: { label: 'Переглянуто', color: 'secondary', variant: 'filled' },
  OVERDUE: { label: 'Прострочено', color: 'error', variant: 'filled' },
  PAID: { label: 'Оплачено', color: 'success', variant: 'filled' },
  CANCELLED: { label: 'Скасовано', color: 'default', variant: 'outlined' },
};

type StatusInput = { status: InvoiceStatus; dueDate: Date; viewedAt: Date | null };

/** `today` — календарна дата за Києвом (див. todayKyiv). */
export function getDisplayStatus({ status, dueDate, viewedAt }: StatusInput, today: Date): DisplayStatus {
  if (status !== 'SENT') return status;
  if (dueDate.getTime() < today.getTime()) return 'OVERDUE';
  return viewedAt ? 'VIEWED' : 'SENT';
}

const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ['SENT'],
  SENT: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: InvoiceStatus, to: InvoiceStatus) {
    super(`Invoice cannot move from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
