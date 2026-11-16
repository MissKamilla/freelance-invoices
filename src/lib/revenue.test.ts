import { describe, expect, it } from 'vitest';
import { kyivMonthKey, lastMonthKeys, monthKeyLabel, monthlyTotals } from './revenue';

describe('revenue helpers', () => {
  it('місяць рахується за Києвом: 31.10 23:30 UTC — це вже листопад', () => {
    expect(kyivMonthKey(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11');
    expect(kyivMonthKey(new Date('2026-10-31T20:00:00Z'))).toBe('2026-10');
  });

  it('останні 6 місяців з переходом через рік', () => {
    expect(lastMonthKeys(new Date('2026-11-16T12:00:00Z'), 6)).toEqual([
      '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11',
    ]);
    expect(lastMonthKeys(new Date('2027-02-10T12:00:00Z'), 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('підписи місяців українською', () => {
    expect(monthKeyLabel('2026-11')).toBe('лист.');
  });

  it('суми по місяцях, оплати поза діапазоном ігноруються', () => {
    const months = ['2026-10', '2026-11'];
    const totals = monthlyTotals(
      [
        { paidAt: new Date('2026-10-05T10:00:00Z'), total: 100_000 },
        { paidAt: new Date('2026-11-01T10:00:00Z'), total: 250_000 },
        { paidAt: new Date('2026-11-15T10:00:00Z'), total: 50_000 },
        { paidAt: new Date('2026-05-01T10:00:00Z'), total: 999_999 },
      ],
      months,
    );
    expect(totals).toEqual([100_000, 300_000]);
  });
});
