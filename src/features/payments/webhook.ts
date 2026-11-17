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

/** Спільний обробник вебхуків: підпис по сирому тілу → applyPaymentUpdate → 200 / 401 / 400 / 500. */
export async function handleWebhook(provider: PaymentProvider, request: Request): Promise<Response> {
  const rawBody = await request.text();

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
