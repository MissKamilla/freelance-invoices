import { createHmac, timingSafeEqual } from 'node:crypto';

export function hmacSha256Hex(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/** Порівняння в сталий час — без витоку інформації через тривалість перевірки. */
export function verifyHmacSha256Hex(secret: string, body: string, signature: string | null): boolean {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(hmacSha256Hex(secret, body), 'hex');
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
