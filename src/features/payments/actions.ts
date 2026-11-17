'use server';
import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { INVALID_REQUEST, parseIdArg } from '@/lib/action-args';
import { fail, type ActionResult } from '@/lib/action-result';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { hmacSha256Hex } from '@/lib/hmac';
import { createRateLimiter } from '@/lib/rate-limit';
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
 * Платежі, які тестовий шлюз саме «списує». Справжній банк не дає двічі оплатити один checkout — без цього
 * подвійний сабміт форми (дві вкладки, повторний POST) надіслав би дві різні події для одного платежу.
 * Пам'ять процесу достатня: mock-провайдер заборонений для публічного розгортання (див. env.ts).
 */
const chargingPayments = new Set<string>();

/** Клієнт опитує статус кожні 2 с (CardPayment): частіше ніж раз на 1,5 с до провайдера за один платіж не ходимо. */
const reconcileByPayment = createRateLimiter(1, 1500);

/**
 * Сабміт форми на сторінці тестового шлюзу: «списуємо» гроші з тестової картки й надсилаємо
 * підписаний вебхук — так само, як це зробив би справжній банк. Статус рахунку змінює лише вебхук.
 */
export async function payWithMockCardAction(paymentIdArg: unknown, cardNumberArg: unknown): Promise<ActionResult> {
  const paymentId = parseIdArg(paymentIdArg);
  const cardNumber = typeof cardNumberArg === 'string' ? cardNumberArg : '';
  if (!paymentId) return fail(INVALID_REQUEST);
  if (chargingPayments.has(paymentId)) return fail('Платіж уже обробляється');
  chargingPayments.add(paymentId);
  try {
    return await chargeAndNotify(paymentId, cardNumber);
  } finally {
    chargingPayments.delete(paymentId);
  }
}

async function chargeAndNotify(paymentId: string, cardNumber: string): Promise<ActionResult> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: { select: { publicToken: true } } },
  });
  const expired = payment?.expiresAt !== null && payment?.expiresAt !== undefined && payment.expiresAt <= new Date();
  if (!payment || payment.provider !== 'MOCK' || payment.status !== 'PENDING' || !payment.externalId || expired) {
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

  // «Банк» доставляє вебхук на APP_URL; якщо застосунок недоступний за цією адресою — це помилка шлюзу, не 500.
  let delivered = false;
  try {
    const response = await fetch(`${env.APP_URL}/api/webhooks/mock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [MOCK_SIGNATURE_HEADER]: hmacSha256Hex(env.MOCK_WEBHOOK_SECRET, body),
      },
      body,
    });
    delivered = response.ok;
  } catch (error) {
    console.error('[payments] mock webhook delivery failed', error);
  }
  if (!delivered) return fail('Платіжний шлюз тимчасово недоступний, спробуйте ще раз');

  redirect(`/i/${payment.invoice.publicToken}?payment=${payment.id}`);
}

/** Клієнт чекає на результат оплати — звіряємо статус з провайдером (для mock — нічого не робить). */
export async function reconcilePaymentAction(paymentIdArg: unknown, tokenArg: unknown): Promise<void> {
  const paymentId = parseIdArg(paymentIdArg);
  const token = parseIdArg(tokenArg);
  if (!paymentId || !token || !reconcileByPayment.hit(paymentId)) return;
  try {
    const result = await reconcilePayment(paymentId, token);
    if (result) await afterPaymentApplied(result);
  } catch (error) {
    console.error('[payments] reconcile failed', error);
  }
}
