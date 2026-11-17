import { describe, expect, it } from 'vitest';
import { fromIsoDate } from './dates';
import { buildPaymentPurpose } from './payment-purpose';

describe('buildPaymentPurpose', () => {
  it('формує призначення платежу з номером і датою у форматі ДД.ММ.РРРР', () => {
    expect(buildPaymentPurpose({ number: 14, issueDate: fromIsoDate('2026-11-16') })).toBe(
      'Оплата за послуги згідно з рахунком № 14 від 16.11.2026 р., без ПДВ',
    );
  });

  it('не зсуває календарну дату, збережену як UTC-північ', () => {
    expect(buildPaymentPurpose({ number: 1, issueDate: fromIsoDate('2026-01-01') })).toContain('від 01.01.2026');
  });
});
