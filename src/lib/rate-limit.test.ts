import { describe, expect, it } from 'vitest';
import { clientIp, createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('пропускає limit спроб у вікні, далі блокує', () => {
    const limiter = createRateLimiter(3, 1000);
    expect([limiter.hit('a', 0), limiter.hit('a', 10), limiter.hit('a', 20)]).toEqual([true, true, true]);
    expect(limiter.hit('a', 30)).toBe(false);
  });

  it('вікно ковзне: звільняється, щойно найстаріша спроба виходить за вікно', () => {
    const limiter = createRateLimiter(2, 1000);
    limiter.hit('a', 0);
    limiter.hit('a', 500);
    expect(limiter.hit('a', 999)).toBe(false);
    expect(limiter.hit('a', 1000)).toBe(true); // спроба з t=0 уже поза вікном
    expect(limiter.hit('a', 1001)).toBe(false); // t=500 і t=1000 ще в ньому
  });

  it('відхилена спроба не зараховується', () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.hit('a', 0);
    limiter.hit('a', 900);
    expect(limiter.hit('a', 1000)).toBe(true);
  });

  it('ключі незалежні', () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('b', 0)).toBe(true);
    expect(limiter.hit('a', 1)).toBe(false);
  });
});

describe('clientIp', () => {
  it('перша адреса з x-forwarded-for, далі x-real-ip, інакше unknown', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
