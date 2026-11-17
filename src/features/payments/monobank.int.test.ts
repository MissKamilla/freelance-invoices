import { createSign, generateKeyPairSync } from 'node:crypto';
import { nanoid } from 'nanoid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPendingPayment } from '@/test/factories';
import { db } from '@/lib/db';
import { monobankProvider } from './providers/monobank';
import { reconcilePayment } from './service';
import { handleWebhook } from './webhook';

// Ключ «monobank» для тесту: публічна частина віддається замість /api/merchant/pubkey.
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicKeyBase64 = Buffer.from(publicKey.export({ type: 'spki', format: 'pem' })).toString('base64');
const sign = (body: string) => createSign('SHA256').update(body).sign(privateKey).toString('base64');

function stubMonobankApi(statusBody?: object) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/api/merchant/pubkey')) return Response.json({ key: publicKeyBase64 });
    if (url.includes('/api/merchant/invoice/status')) return Response.json(statusBody);
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function monobankPayment() {
  const { invoice, payment } = await createPendingPayment();
  const externalId = `p2_${nanoid(10)}`;
  await db.payment.update({ where: { id: payment.id }, data: { provider: 'MONOBANK', externalId } });
  return { invoice, payment, externalId };
}

const statusBody = (invoiceId: string, status = 'success', amount = 2_850_000) => ({
  invoiceId,
  status,
  amount,
  ccy: 980,
  modifiedDate: new Date().toISOString(),
});

afterEach(() => vi.unstubAllGlobals());

describe('monobank webhook', () => {
  it('валідний підпис → рахунок оплачено', async () => {
    stubMonobankApi();
    const { invoice, externalId } = await monobankPayment();
    const body = JSON.stringify(statusBody(externalId));

    const response = await handleWebhook(
      monobankProvider,
      new Request('http://localhost/api/webhooks/monobank', {
        method: 'POST',
        body,
        headers: { 'x-sign': sign(body) },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ outcome: 'paid' });
    expect(await db.invoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: 'PAID' });
  });

  it('невалідний підпис → 401, нічого не змінюється', async () => {
    stubMonobankApi();
    const { invoice, externalId } = await monobankPayment();
    const body = JSON.stringify(statusBody(externalId));

    const response = await handleWebhook(
      monobankProvider,
      new Request('http://localhost/api/webhooks/monobank', {
        method: 'POST',
        body,
        headers: { 'x-sign': sign(body.replace('success', 'failure')) },
      }),
    );

    expect(response.status).toBe(401);
    expect(await db.invoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: 'SENT' });
  });
});

describe('webhook body limit', () => {
  it('завелике тіло → 413 ще до перевірки підпису й без звернення до monobank', async () => {
    const fetchMock = stubMonobankApi();
    const { invoice, externalId } = await monobankPayment();
    const body = JSON.stringify({ ...statusBody(externalId), padding: 'x'.repeat(70_000) });

    const response = await handleWebhook(
      monobankProvider,
      new Request('http://localhost/api/webhooks/monobank', {
        method: 'POST',
        body,
        headers: { 'x-sign': sign(body) },
      }),
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await db.invoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: 'SENT' });
  });

  it('chunked-тіло без Content-Length теж обмежене: 413, читання зупиняється на ліміті', async () => {
    const fetchMock = stubMonobankApi();
    const chunk = new TextEncoder().encode('x'.repeat(16 * 1024));
    let pulled = 0;
    // 1 MB шматками по 16 KB. Без ліміту під час читання обробник вичитав би все тіло в пам'ять (будь-якого розміру).
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 64) controller.close();
        else controller.enqueue(chunk);
      },
    });

    const response = await handleWebhook(
      monobankProvider,
      new Request('http://localhost/api/webhooks/monobank', { method: 'POST', body, duplex: 'half' } as RequestInit),
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(pulled).toBeLessThan(10);
  });

  it('звичайне тіло з кирилицею читається без змін — підпис сходиться', async () => {
    stubMonobankApi();
    const { invoice, externalId } = await monobankPayment();
    const body = JSON.stringify({ ...statusBody(externalId), destination: 'Оплата рахунку № 1 — ґ, є, ї' });

    const response = await handleWebhook(
      monobankProvider,
      new Request('http://localhost/api/webhooks/monobank', {
        method: 'POST',
        body,
        headers: { 'x-sign': sign(body) },
      }),
    );

    expect(response.status).toBe(200);
    expect(await db.invoice.findUnique({ where: { id: invoice.id } })).toMatchObject({ status: 'PAID' });
  });
});

describe('reconcilePayment (звірка без вебхука)', () => {
  it('отримує статус у провайдера й застосовує його тим самим шляхом, що й вебхук', async () => {
    const { invoice, payment, externalId } = await monobankPayment();
    const fetchMock = stubMonobankApi(statusBody(externalId));

    const result = await reconcilePayment(payment.id, invoice.publicToken!);

    expect(result?.outcome).toBe('paid');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/merchant/invoice/status?invoiceId=${externalId}`),
      expect.anything(),
    );
    // Платіж уже не PENDING — повторна звірка нічого не робить.
    expect(await reconcilePayment(payment.id, invoice.publicToken!)).toBeNull();
  });

  it('чужий токен не дає звіряти платіж', async () => {
    const { payment, externalId } = await monobankPayment();
    stubMonobankApi(statusBody(externalId));
    expect(await reconcilePayment(payment.id, 'wrong-token')).toBeNull();
  });
});

describe('monobank pubkey cache', () => {
  it('паралельні вебхуки на холодному кеші роблять один запит публічного ключа', async () => {
    const fetchMock = stubMonobankApi();
    vi.resetModules(); // свіжий модуль = порожній кеш ключа
    const { monobankProvider: fresh } = await import('./providers/monobank');
    const body = JSON.stringify(statusBody('p2_cold'));
    const headers = new Headers({ 'x-sign': sign(body) });

    const updates = await Promise.all(Array.from({ length: 5 }, () => fresh.verifyAndParseWebhook(body, headers)));

    expect(updates.every((u) => u.status === 'SUCCEEDED')).toBe(true);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/merchant/pubkey'))).toHaveLength(1);
  });
});
