import 'server-only';
import { sendInvoicePaidEmails } from '@/features/notifications/email';
import { invoicePaid } from '@/inngest/client';
import { dispatch } from '@/inngest/dispatch';
import { WebhookSignatureError } from './errors';
import type { PaymentProvider } from './providers/types';
import { applyPaymentUpdate, type ApplyResult } from './service';

/** Після застосування події: якщо рахунок щойно оплачено — листи у фоні (або синхронно без Inngest). */
export async function afterPaymentApplied(result: ApplyResult) {
  if (result.outcome !== 'paid' || !result.invoiceId) return;
  const invoiceId = result.invoiceId;
  await dispatch(invoicePaid.create({ invoiceId, notifyFreelancer: true }), () => sendInvoicePaidEmails(invoiceId));
}

/** Події провайдерів — кілька сотень байтів; усе більше відкидаємо ще до перевірки підпису. */
const MAX_BODY_BYTES = 64 * 1024;

/** Спільний обробник вебхуків: ліміт розміру → підпис по сирому тілу → applyPaymentUpdate → 200 / 401 / 400 / 413 / 500. */
export async function handleWebhook(provider: PaymentProvider, request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (declaredLength > MAX_BODY_BYTES) return Response.json({ error: 'payload too large' }, { status: 413 });
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return Response.json({ error: 'payload too large' }, { status: 413 });

  let update;
  try {
    update = await provider.verifyAndParseWebhook(rawBody, request.headers);
  } catch (error) {
    if (error instanceof WebhookSignatureError) return Response.json({ error: 'invalid signature' }, { status: 401 });
    console.error(`[webhooks/${provider.id}] invalid payload`, error);
    return Response.json({ error: 'invalid payload' }, { status: 400 });
  }

  try {
    const result = await applyPaymentUpdate(update);
    await afterPaymentApplied(result);
    return Response.json({ received: true, outcome: result.outcome });
  } catch (error) {
    // 500 → провайдер повторить доставку; транзакція відкотилась, подія не загубиться.
    console.error(`[webhooks/${provider.id}] failed to apply update`, error);
    return Response.json({ error: 'processing failed' }, { status: 500 });
  }
}
