import 'server-only';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { planReminders } from '@/lib/reminders';
import {
  recordEmailEvent,
  sendInvoiceIssuedEmail,
  sendInvoicePaidEmails,
  sendReminderEmail,
  type SendResult,
} from '@/features/notifications/email';
import type { ReminderKind } from '@/lib/reminders';
import { inngest, invoiceCancelled, invoiceIssued, invoicePaid, reminderRequested } from './client';

const sameInvoice = 'async.data.invoiceId == event.data.invoiceId';

type Step = Parameters<Parameters<typeof inngest.createFunction>[1]>[0]['step'];

/** Відправка листа й запис події — окремі кроки: ретрай запису події не дублює лист. */
async function sendReminderStep(step: Step, invoiceId: string, kind: ReminderKind) {
  const result: SendResult = await step.run(`send-${kind}`, () =>
    sendReminderEmail(invoiceId, kind, { recordEvent: false }),
  );
  if (result.sent)
    await step.run(`record-${kind}`, () => recordEmailEvent(invoiceId, 'REMINDER_SENT', { kind, to: result.to }));
}

/** Лист клієнту з рахунком — у фоні, з ретраями. */
export const sendInvoiceEmail = inngest.createFunction(
  { id: 'send-invoice-email', triggers: [invoiceIssued] },
  async ({ event, step }) => {
    const { invoiceId } = event.data;
    const result: SendResult = await step.run('send-invoice-email', () =>
      sendInvoiceIssuedEmail(invoiceId, { recordEvent: false }),
    );
    if (result.sent) {
      await step.run('record-email-event', () =>
        recordEmailEvent(invoiceId, 'EMAIL_SENT', { kind: 'invoice', to: result.to }),
      );
    }
  },
);

/**
 * Нагадування: за день до терміну й після прострочення. Run скасовується автоматично,
 * щойно рахунок оплатили або скасували (cancelOn), — без ручних перевірок і cron.
 */
export const invoiceReminders = inngest.createFunction(
  {
    id: 'invoice-reminders',
    triggers: [invoiceIssued],
    cancelOn: [
      { event: invoicePaid, if: sameInvoice },
      { event: invoiceCancelled, if: sameInvoice },
    ],
  },
  async ({ event, step }) => {
    // Розклад рахуємо в кроці: функція переграється після кожного сну, а результат кроку мемоізується.
    const plan = await step.run('plan-reminders', async () => {
      const invoice = await db.invoice.findUnique({
        where: { id: event.data.invoiceId },
        select: { dueDate: true, issuedAt: true },
      });
      if (!invoice?.issuedAt) return null;
      const { beforeDue, overdue } = planReminders({
        dueDate: invoice.dueDate,
        issuedAt: invoice.issuedAt,
        now: new Date(),
        demo: env.REMINDER_DEMO_MODE,
      });
      return { beforeDue: beforeDue?.toISOString() ?? null, overdue: overdue.toISOString() };
    });
    if (!plan) return { skipped: 'invoice not found' };

    if (plan.beforeDue) {
      await step.sleepUntil('wait-before-due', plan.beforeDue);
      await sendReminderStep(step, event.data.invoiceId, 'before_due');
    }
    await step.sleepUntil('wait-overdue', plan.overdue);
    await sendReminderStep(step, event.data.invoiceId, 'overdue');
  },
);

export const sendPaidEmails = inngest.createFunction(
  { id: 'send-paid-emails', triggers: [invoicePaid] },
  async ({ event, step }) => {
    await step.run('send-paid-emails', () =>
      sendInvoicePaidEmails(event.data.invoiceId, { notifyFreelancer: event.data.notifyFreelancer }),
    );
  },
);

export const manualReminder = inngest.createFunction(
  { id: 'manual-reminder', triggers: [reminderRequested] },
  async ({ event, step }) => {
    await sendReminderStep(step, event.data.invoiceId, 'manual');
  },
);

export const functions = [sendInvoiceEmail, invoiceReminders, sendPaidEmails, manualReminder];
