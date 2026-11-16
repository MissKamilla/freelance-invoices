import { WebhookSignatureError } from '@/features/payments/errors';
import { mockProvider } from '@/features/payments/providers/mock';
import { applyPaymentUpdate } from '@/features/payments/service';
import { safely, sendInvoicePaidEmails } from '@/features/notifications/email';

export async function POST(request: Request) {
  // Підпис рахуємо по сирому тілу — до будь-якого JSON.parse.
  const rawBody = await request.text();

  let update;
  try {
    update = await mockProvider.verifyAndParseWebhook(rawBody, request.headers);
  } catch (error) {
    if (error instanceof WebhookSignatureError) return Response.json({ error: 'invalid signature' }, { status: 401 });
    return Response.json({ error: 'invalid payload' }, { status: 400 });
  }

  try {
    const result = await applyPaymentUpdate(update);
    if (result.outcome === 'paid' && result.invoiceId) {
      const invoiceId = result.invoiceId;
      await safely(() => sendInvoicePaidEmails(invoiceId));
    }
    return Response.json({ received: true, outcome: result.outcome });
  } catch (error) {
    // 500 → провайдер повторить доставку; транзакція відкотилась, подія не загубиться.
    console.error('[webhooks/mock] failed to apply update', error);
    return Response.json({ error: 'processing failed' }, { status: 500 });
  }
}
