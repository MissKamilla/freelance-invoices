import { eventType, Inngest } from 'inngest';
import { z } from 'zod';

// Локально SDK працює з Inngest Dev Server (INNGEST_DEV=1, http://localhost:8288).
export const inngest = new Inngest({ id: 'freelance-invoices' });

const invoiceRef = z.object({ invoiceId: z.string() });

export const invoiceIssued = eventType('invoice/issued', { schema: invoiceRef });
export const invoiceCancelled = eventType('invoice/cancelled', { schema: invoiceRef });
export const invoicePaid = eventType('invoice/paid', {
  schema: z.object({ invoiceId: z.string(), notifyFreelancer: z.boolean() }),
});
export const reminderRequested = eventType('invoice/reminder.requested', { schema: invoiceRef });
