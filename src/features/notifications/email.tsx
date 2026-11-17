import 'server-only';
import { InvoiceIssuedEmail } from '@/emails/InvoiceIssuedEmail';
import { InvoicePaidEmail } from '@/emails/InvoicePaidEmail';
import { PaymentConfirmationEmail } from '@/emails/PaymentConfirmationEmail';
import { ReminderEmail, reminderSubject } from '@/emails/ReminderEmail';
import { clientSnapshotSchema, sellerSnapshotSchema } from '@/features/invoices/snapshot';
import { db } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/dates';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/mailer';
import { formatMoney } from '@/lib/money';
import type { ReminderKind } from '@/lib/reminders';

const PROVIDER_LABELS = {
  MOCK: 'карткою',
  MONOBANK: 'карткою через monobank',
  MANUAL: 'переказом на рахунок',
} as const;

async function loadIssued(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      user: { select: { email: true } },
      payments: { where: { status: 'SUCCEEDED' }, orderBy: { paidAt: 'desc' }, take: 1 },
    },
  });
  if (!invoice?.number || !invoice.publicToken) return null;
  return {
    invoice,
    number: invoice.number,
    seller: sellerSnapshotSchema.parse(invoice.sellerSnapshot),
    client: clientSnapshotSchema.parse(invoice.clientSnapshot),
    publicUrl: `${env.APP_URL}/i/${invoice.publicToken}`,
  };
}

type SendOptions = {
  /**
   * Записати подію в історію одразу після відправки. Inngest робить це окремим кроком: якщо запис події впаде,
   * ретрай не надішле лист удруге.
   */
  recordEvent?: boolean;
};

export type SendResult = { sent: false } | { sent: true; to: string };

/** Подія «лист надіслано» / «нагадування надіслано» в історії рахунку. */
export async function recordEmailEvent(invoiceId: string, type: 'EMAIL_SENT' | 'REMINDER_SENT', meta: object) {
  await db.invoiceEvent.create({ data: { invoiceId, type, meta } });
}

/** Клієнту: рахунок із посиланням на оплату. */
export async function sendInvoiceIssuedEmail(
  invoiceId: string,
  { recordEvent = true }: SendOptions = {},
): Promise<SendResult> {
  const data = await loadIssued(invoiceId);
  if (!data || data.invoice.status !== 'SENT') return { sent: false };

  await sendEmail({
    to: data.client.email,
    subject: `Рахунок № ${data.number} від ${data.seller.legalName}`,
    react: (
      <InvoiceIssuedEmail
        sellerName={data.seller.legalName}
        number={data.number}
        total={formatMoney(data.invoice.total)}
        dueDate={formatDate(data.invoice.dueDate)}
        url={data.publicUrl}
        notes={data.invoice.notes}
      />
    ),
  });
  if (recordEvent) await recordEmailEvent(invoiceId, 'EMAIL_SENT', { kind: 'invoice', to: data.client.email });
  return { sent: true, to: data.client.email };
}

/** Клієнту — підтвердження оплати; фрилансеру — «Вам оплатили» (крім ручної позначки, яку він зробив сам). */
export async function sendInvoicePaidEmails(invoiceId: string, { notifyFreelancer = true } = {}) {
  const data = await loadIssued(invoiceId);
  if (!data || data.invoice.status !== 'PAID' || !data.invoice.paidAt) return;

  const total = formatMoney(data.invoice.total);
  const provider = data.invoice.payments[0]?.provider ?? 'MANUAL';

  await sendEmail({
    to: data.client.email,
    subject: `Оплату рахунку № ${data.number} отримано`,
    react: (
      <PaymentConfirmationEmail
        sellerName={data.seller.legalName}
        number={data.number}
        total={total}
        paidAt={formatDateTime(data.invoice.paidAt)}
      />
    ),
  });

  if (notifyFreelancer) {
    await sendEmail({
      to: data.invoice.user.email,
      subject: `Вам оплатили рахунок № ${data.number} — ${total}`,
      react: (
        <InvoicePaidEmail
          clientName={data.client.name}
          number={data.number}
          total={total}
          method={PROVIDER_LABELS[provider]}
          url={`${env.APP_URL}/invoices/${invoiceId}`}
        />
      ),
    });
  }
}

/** Клієнту: нагадування про оплату. Нічого не робить, якщо рахунок уже оплачено чи скасовано. */
export async function sendReminderEmail(
  invoiceId: string,
  kind: ReminderKind,
  { recordEvent = true }: SendOptions = {},
): Promise<SendResult> {
  const data = await loadIssued(invoiceId);
  if (!data || data.invoice.status !== 'SENT') return { sent: false };

  await sendEmail({
    to: data.client.email,
    subject: reminderSubject(kind, data.number),
    react: (
      <ReminderEmail
        kind={kind}
        sellerName={data.seller.legalName}
        number={data.number}
        total={formatMoney(data.invoice.total)}
        dueDate={formatDate(data.invoice.dueDate)}
        url={data.publicUrl}
      />
    ),
  });
  if (recordEvent) await recordEmailEvent(invoiceId, 'REMINDER_SENT', { kind, to: data.client.email });
  return { sent: true, to: data.client.email };
}
