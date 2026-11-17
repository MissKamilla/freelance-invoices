/**
 * Обмеження частоти в пам'яті процесу — ковзне вікно на мітках часу, без таймерів: прострочені мітки
 * прибираються при зверненні до ключа, а раз на вікно — для всіх ключів (щоб Map не ріс нескінченно).
 * Діє в межах одного інстансу застосунку; спільне сховище (Redis) — наступний крок, див. README.
 */
export type RateLimiter = {
  /** Зараховує спробу. true — дозволено; false — ліміт за ключем вичерпано (відхилена спроба не рахується). */
  hit(key: string, now?: number): boolean;
};

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();
  let sweptAt = 0;

  return {
    hit(key, now = Date.now()) {
      if (now - sweptAt >= windowMs) {
        sweptAt = now;
        for (const [k, stamps] of hits) {
          if (stamps.every((t) => now - t >= windowMs)) hits.delete(k);
        }
      }
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      hits.set(key, recent);
      if (recent.length >= limit) return false;
      recent.push(now);
      return true;
    },
  };
}

/** IP клієнта з заголовків проксі — best effort: без довіреного проксі заголовок можна підробити. */
export function clientIp(requestHeaders: Headers): string {
  return requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || 'unknown';
}
