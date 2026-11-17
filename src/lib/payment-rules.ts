import type { Currency, InvoiceEventType, InvoiceStatus, PaymentStatus } from '@/generated/prisma/enums';

/**
 * Статуси платежу рухаються лише вперед. Успіх приймаємо і після FAILED/EXPIRED:
 * гроші могли списатися пізніше (повторна спроба на сторінці провайдера, оплата вже скасованого рахунку) —
 * такий платіж треба зафіксувати, щоб фрилансер міг повернути кошти.
 */
const ALLOWED: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ['SUCCEEDED', 'FAILED', 'EXPIRED'],
  FAILED: ['SUCCEEDED'],
  EXPIRED: ['SUCCEEDED'],
  SUCCEEDED: ['REFUNDED'],
  REFUNDED: [],
};

export function canPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED[from].includes(to);
}

export type PaymentOutcome =
  'paid' | 'amount_mismatch' | 'needs_refund' | 'failed' | 'expired' | 'refunded' | 'stale' | 'ignored';

export type PaymentDecision = {
  outcome: PaymentOutcome;
  /** Новий статус платежу або null — без змін. */
  paymentStatus: PaymentStatus | null;
  markInvoicePaid: boolean;
  event: InvoiceEventType | null;
};

type DecisionInput = {
  update: { status: PaymentStatus; amount: number; currency: Currency; occurredAt: Date };
  payment: { status: PaymentStatus; providerUpdatedAt: Date | null };
  invoice: { status: InvoiceStatus; total: number; currency: Currency };
};

const noChange = (outcome: PaymentOutcome): PaymentDecision => ({
  outcome,
  paymentStatus: null,
  markInvoicePaid: false,
  event: null,
});

/** Що зробити з платежем і рахунком у відповідь на подію від провайдера. Чиста функція — легко тестувати. */
export function decidePaymentUpdate({ update, payment, invoice }: DecisionInput): PaymentDecision {
  if (payment.providerUpdatedAt && update.occurredAt.getTime() <= payment.providerUpdatedAt.getTime()) {
    return noChange('stale');
  }
  if (!canPaymentTransition(payment.status, update.status)) return noChange('ignored');

  switch (update.status) {
    case 'SUCCEEDED': {
      const base = { paymentStatus: 'SUCCEEDED' as const };
      if (update.amount !== invoice.total || update.currency !== invoice.currency) {
        return { ...base, outcome: 'amount_mismatch', markInvoicePaid: false, event: 'AMOUNT_MISMATCH' };
      }
      if (invoice.status === 'SENT') {
        return { ...base, outcome: 'paid', markInvoicePaid: true, event: 'PAID' };
      }
      // Рахунок уже оплачено (інший платіж / ручна позначка) або скасовано — гроші треба повернути.
      return { ...base, outcome: 'needs_refund', markInvoicePaid: false, event: 'NEEDS_REFUND' };
    }
    case 'FAILED':
      return { outcome: 'failed', paymentStatus: 'FAILED', markInvoicePaid: false, event: 'PAYMENT_FAILED' };
    case 'EXPIRED':
      return { outcome: 'expired', paymentStatus: 'EXPIRED', markInvoicePaid: false, event: null };
    case 'REFUNDED':
      return { outcome: 'refunded', paymentStatus: 'REFUNDED', markInvoicePaid: false, event: 'REFUNDED' };
    default:
      return noChange('ignored');
  }
}
