import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { decidePaymentUpdate, type PaymentOutcome } from '@/lib/payment-rules';
import { PaymentError } from './errors';
import { getActiveProvider, getProvider } from './providers';
import type { ProviderPaymentUpdate } from './providers/types';

const CHECKOUT_TTL_MS = 60 * 60 * 1000;

/**
 * Старт оплати карткою.
 * 1) Транзакція з блокуванням рядка рахунку: рахунок має бути SENT; прострочені PENDING → EXPIRED;
 *    живий PENDING-платіж використовуємо повторно, інакше створюємо новий.
 * 2) Після коміту — запит до провайдера (мережевий виклик не тримає транзакцію відкритою).
 */
export async function startPayment(publicToken: string): Promise<string> {
  const invoice = await db.invoice.findFirst({
    where: { publicToken },
    select: { id: true, status: true, total: true, currency: true, number: true, paymentPurpose: true },
  });
  if (!invoice || invoice.status !== 'SENT') throw new PaymentError('Цей рахунок уже не можна оплатити');

  const provider = getActiveProvider();
  const now = new Date();

  const { payment, reused } = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "invoice" WHERE id = ${invoice.id} FOR UPDATE`;
    const fresh = await tx.invoice.findUnique({ where: { id: invoice.id }, select: { status: true } });
    if (fresh?.status !== 'SENT') throw new PaymentError('Цей рахунок уже не можна оплатити');

    await tx.payment.updateMany({
      where: { invoiceId: invoice.id, status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    const live = await tx.payment.findFirst({
      where: {
        invoiceId: invoice.id,
        provider: provider.id,
        status: 'PENDING',
        expiresAt: { gt: now },
        checkoutUrl: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (live) return { payment: live, reused: true };

    const created = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        provider: provider.id,
        amount: invoice.total,
        currency: invoice.currency,
        expiresAt: new Date(now.getTime() + CHECKOUT_TTL_MS),
      },
    });
    return { payment: created, reused: false };
  });

  if (reused && payment.checkoutUrl) return payment.checkoutUrl;

  try {
    const { externalId, checkoutUrl } = await provider.createCheckout({
      paymentId: payment.id,
      amount: payment.amount,
      reference: `invoice-${invoice.number}`,
      purpose: invoice.paymentPurpose ?? `Оплата рахунку № ${invoice.number}`,
      redirectUrl: `${env.APP_URL}/i/${publicToken}?payment=${payment.id}`,
      webhookUrl: env.PUBLIC_URL ? `${env.PUBLIC_URL}/api/webhooks/${provider.id.toLowerCase()}` : undefined,
    });
    await db.$transaction([
      db.payment.update({ where: { id: payment.id }, data: { externalId, checkoutUrl } }),
      db.invoiceEvent.create({
        data: {
          invoiceId: invoice.id,
          type: 'PAYMENT_STARTED',
          meta: { provider: provider.id, paymentId: payment.id },
        },
      }),
    ]);
    return checkoutUrl;
  } catch (error) {
    console.error('[payments] createCheckout failed', error);
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: 'Не вдалося створити платіж у провайдера' },
    });
    throw new PaymentError('Не вдалося розпочати оплату. Спробуйте ще раз або оплатіть переказом.');
  }
}

export type ApplyResult = {
  outcome: PaymentOutcome | 'duplicate' | 'unknown_payment';
  invoiceId?: string;
};

/**
 * Єдина точка застосування подій від провайдера (вебхук або звірка статусу).
 * Усе в одній транзакції: запис WebhookEvent (дедуплікація), блокування рахунку, рішення
 * decidePaymentUpdate, зміна платежу/рахунку, подія в історії, processedAt.
 * Якщо щось впало — відкочується і запис події, тож повторна доставка обробиться заново.
 */
export async function applyPaymentUpdate(update: ProviderPaymentUpdate): Promise<ApplyResult> {
  try {
    return await db.$transaction(async (tx) => {
      const seen = await tx.webhookEvent.findUnique({
        where: { provider_dedupeKey: { provider: update.provider, dedupeKey: update.dedupeKey } },
      });
      if (seen?.processedAt) return { outcome: 'duplicate' };

      const eventRow =
        seen ??
        (await tx.webhookEvent.create({
          data: {
            provider: update.provider,
            dedupeKey: update.dedupeKey,
            payload: update.raw as Prisma.InputJsonValue,
          },
        }));
      const markProcessed = () =>
        tx.webhookEvent.update({ where: { id: eventRow.id }, data: { processedAt: new Date() } });

      const payment = await tx.payment.findUnique({
        where: { provider_externalId: { provider: update.provider, externalId: update.externalId } },
      });
      if (!payment) {
        await markProcessed();
        return { outcome: 'unknown_payment' };
      }

      await tx.$queryRaw`SELECT id FROM "invoice" WHERE id = ${payment.invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: payment.invoiceId },
        select: { id: true, status: true, total: true, currency: true },
      });

      const decision = decidePaymentUpdate({ update, payment, invoice });

      if (decision.paymentStatus) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: decision.paymentStatus,
            providerUpdatedAt: update.occurredAt,
            failureReason: update.failureReason ?? null,
            ...(decision.paymentStatus === 'SUCCEEDED' && { paidAt: update.occurredAt }),
          },
        });
      }
      if (decision.markInvoicePaid) {
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: update.occurredAt } });
      }
      if (decision.event) {
        await tx.invoiceEvent.create({
          data: {
            invoiceId: invoice.id,
            type: decision.event,
            meta: {
              provider: update.provider,
              paymentId: payment.id,
              amount: update.amount,
              ...(decision.outcome === 'amount_mismatch' && { expected: invoice.total }),
              ...(update.failureReason && { reason: update.failureReason }),
            },
          },
        });
      }

      await markProcessed();
      return { outcome: decision.outcome, invoiceId: invoice.id };
    });
  } catch (error) {
    // Дві паралельні доставки однієї події: друга впирається в unique — це дублікат, а не помилка.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { outcome: 'duplicate' };
    }
    throw error;
  }
}

/** Платіж для сторінки тестового checkout. */
export function getCheckoutPayment(paymentId: string) {
  return db.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        select: { status: true, number: true, publicToken: true, total: true, sellerSnapshot: true },
      },
    },
  });
}

/**
 * Звірка статусу з провайдером (для monobank локально без публічного URL для вебхуків).
 * Проходить тим самим шляхом, що й вебхук, — applyPaymentUpdate з тим самим ключем ідемпотентності.
 */
export async function reconcilePayment(paymentId: string, publicToken: string): Promise<ApplyResult | null> {
  const payment = await db.payment.findFirst({
    where: { id: paymentId, status: 'PENDING', invoice: { publicToken } },
    select: { provider: true, externalId: true },
  });
  if (!payment?.externalId || payment.provider === 'MANUAL') return null;

  const provider = getProvider(payment.provider);
  if (!provider.fetchStatus) return null;
  return applyPaymentUpdate(await provider.fetchStatus(payment.externalId));
}

/** Скасувати незавершені checkout-и в провайдера (best effort — рахунок уже скасовано в нас). */
export async function cancelProviderCheckouts(payments: { provider: string; externalId: string | null }[]) {
  await Promise.all(
    payments.map(async ({ provider, externalId }) => {
      if (!externalId || (provider !== 'MOCK' && provider !== 'MONOBANK')) return;
      try {
        await getProvider(provider).cancel?.(externalId);
      } catch (error) {
        console.error('[payments] provider cancel failed', error);
      }
    }),
  );
}
