const monthInKyiv = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit' });
const monthLabel = new Intl.DateTimeFormat('uk-UA', { month: 'short', timeZone: 'UTC' });

/** Місяць моменту часу за Києвом: 'YYYY-MM'. */
export function kyivMonthKey(moment: Date): string {
  return monthInKyiv.format(moment).slice(0, 7);
}

/** Останні n календарних місяців (включно з поточним), від найстаршого: ['2026-06', …, '2026-11']. */
export function lastMonthKeys(today: Date, n: number): string[] {
  const [year, month] = kyivMonthKey(today).split('-').map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (n - 1 - i), 1));
    return date.toISOString().slice(0, 7);
  });
}

/** 'YYYY-MM' → «лист.» */
export function monthKeyLabel(key: string): string {
  return monthLabel.format(new Date(`${key}-01T00:00:00Z`));
}

/** Сума оплат за кожен місяць (копійки); місяці без оплат — 0. */
export function monthlyTotals(
  payments: readonly { paidAt: Date; total: number }[],
  months: readonly string[],
): number[] {
  const totals = new Map(months.map((key) => [key, 0]));
  for (const { paidAt, total } of payments) {
    const key = kyivMonthKey(paidAt);
    const current = totals.get(key);
    if (current !== undefined) totals.set(key, current + total);
  }
  return months.map((key) => totals.get(key) ?? 0);
}
