import { describe, expect, it } from 'vitest';
import { hmacSha256Hex, verifyHmacSha256Hex } from './hmac';

describe('HMAC-підпис вебхука', () => {
  const secret = 'test-secret';
  const body = '{"eventId":"e1","status":"success","amount":2850000}';

  it('приймає правильний підпис', () => {
    expect(verifyHmacSha256Hex(secret, body, hmacSha256Hex(secret, body))).toBe(true);
  });

  it('відхиляє змінене тіло, чужий секрет і відсутній підпис', () => {
    const signature = hmacSha256Hex(secret, body);
    expect(verifyHmacSha256Hex(secret, body.replace('2850000', '100'), signature)).toBe(false);
    expect(verifyHmacSha256Hex('other-secret', body, signature)).toBe(false);
    expect(verifyHmacSha256Hex(secret, body, null)).toBe(false);
    expect(verifyHmacSha256Hex(secret, body, 'not-hex')).toBe(false);
  });
});
