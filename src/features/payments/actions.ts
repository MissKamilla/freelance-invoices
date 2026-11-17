'use server';
import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { INVALID_REQUEST, parseIdArg } from '@/lib/action-args';
import { fail, type ActionResult } from '@/lib/action-result';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { hmacSha256Hex } from '@/lib/hmac';
import { PaymentError } from './errors';
import { chargeMockCard } from './mock-gateway';
import { MOCK_SIGNATURE_HEADER, type MockWebhookEvent } from './providers/mock';
import { reconcilePayment, startPayment } from './service';
import { afterPaymentApplied } from './webhook';

export async function startPaymentAction(tokenArg: unknown): Promise<ActionResult> {
  const token = parseIdArg(tokenArg);
  if (!token) return fail(INVALID_REQUEST);
  let checkoutUrl: string;
  try {
    checkoutUrl = await startPayment(token);
  } catch (error) {
    if (error instanceof PaymentError) return fail(error.message);
    throw error;
  }
  redirect(checkoutUrl);
}

/**
 * Сабміт форми на сторінці тестового шлюзу: «списуємо» гроші з тестової картки й надсилаємо
 * підписаний вебхук — так само, як це зробив би справжній банк. Статус рахунку змінює лише вебхук.
 */
export async function payWithMockCardAction(paymentIdArg: unknown, cardNumberArg: unknown): Promise<ActionResult> {
  const paymentId = parseIdArg(paymentIdArg);
  const cardNumber = typeof cardNumberArg === 'string' ? cardNumberArg : '';
  if (!paymentId) return fail(INVALID_REQUEST);
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { select: { publicToken: true } } },
  });
  if (!payment || payment.provider !== 'MOCK' || payment.status !== 'PENDING' || !payment.externalId) {
    return fail('Платіж неактуальний — поверніться до рахунку й почніть оплату знову');
  }

  const charge = chargeMockCard(cardNumber, payment.amount);
  const event: MockWebhookEvent = {
    eventId: `evt_${nanoid(16)}`,
    externalId: payment.externalId,
    status: charge.status,
    amount: charge.chargedAmount,
    currency: 'UAH',
    occurredAt: new Date().toISOString(),
    ...(charge.status === 'failure' && { failureReason: charge.failureReason }),
  };
  const body = JSON.stringify(event);

  const response = await fetch(`${env.APP_URL}/api/webhooks/mock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [MOCK_SIGNATURE_HEADER]: hmacSha256Hex(env.MOCK_WEBHOOK_SECRET, body),
    },
    body,
  });
  if (!response.ok) return fail('Платіжний шлюз тимчасово недоступний, спробуйте ще раз');

  redirect(`/i/${payment.invoice.publicToken}?payment=${payment.id}`);
}

/** Клієнт чекає на результат оплати — звіряємо статус з провайдером (для mock — нічого не робить). */
export async function reconcilePaymentAction(paymentIdArg: unknown, tokenArg: unknown): Promise<void> {
  const paymentId = parseIdArg(paymentIdArg);
  const token = parseIdArg(tokenArg);
  if (!paymentId || !token) return;
  try {
    const result = await reconcilePayment(paymentId, token);
    if (result) await afterPaymentApplied(result);
  } catch (error) {
    console.error('[payments] reconcile failed', error);
  }
}
