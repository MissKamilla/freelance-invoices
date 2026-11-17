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

/**
 * Читає тіло потоково з межею в байтах: у chunked-запиту немає content-length, а request.text() зчитав би
 * все в пам'ять. null — ліміт перевищено, читання зупинено. Декодування таке саме, як у request.text()
 * (UTF-8 без fatal, BOM відкидається), тож рядок байт у байт той самий — підпис перевіряється саме по ньому.
 */
async function readBodyLimited(request: Request, maxBytes: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** Спільний обробник вебхуків: ліміт розміру → підпис по сирому тілу → applyPaymentUpdate → 200 / 401 / 400 / 413 / 500. */
export async function handleWebhook(provider: PaymentProvider, request: Request): Promise<Response> {
  const tooLarge = () => Response.json({ error: 'payload too large' }, { status: 413 });
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return tooLarge();
  const rawBody = await readBodyLimited(request, MAX_BODY_BYTES);
  if (rawBody === null) return tooLarge();

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
