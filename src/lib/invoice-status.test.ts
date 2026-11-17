import { describe, expect, it } from 'vitest';
import { addDays, formatDate, formatDateLong, fromIsoDate, toIsoDate, todayKyiv } from './dates';
import { assertTransition, canTransition, getDisplayStatus, InvalidTransitionError } from './invoice-status';
import { buildPaymentPurpose } from './payment-purpose';

const today = fromIsoDate('2026-11-16');

describe('getDisplayStatus', () => {
  const sent = { status: 'SENT' as const, dueDate: fromIsoDate('2026-11-20'), viewedAt: null };

  it('SENT без перегляду → Виставлено', () => {
    expect(getDisplayStatus(sent, today)).toBe('SENT');
  });

  it('SENT з переглядом → Переглянуто', () => {
    expect(getDisplayStatus({ ...sent, viewedAt: new Date() }, today)).toBe('VIEWED');
  });

  it('термін минув → Прострочено (навіть якщо переглянуто)', () => {
    expect(getDisplayStatus({ ...sent, dueDate: fromIsoDate('2026-11-15'), viewedAt: new Date() }, today)).toBe(
      'OVERDUE',
    );
  });

  it('день терміну оплати ще не прострочення', () => {
    expect(getDisplayStatus({ ...sent, dueDate: today }, today)).toBe('SENT');
  });

  it('інші статуси повертаються як є', () => {
    expect(getDisplayStatus({ ...sent, status: 'PAID', dueDate: fromIsoDate('2020-01-01') }, today)).toBe('PAID');
    expect(getDisplayStatus({ ...sent, status: 'DRAFT' }, today)).toBe('DRAFT');
    expect(getDisplayStatus({ ...sent, status: 'CANCELLED' }, today)).toBe('CANCELLED');
  });
});

describe('переходи статусів', () => {
  it('дозволені', () => {
    expect(canTransition('DRAFT', 'SENT')).toBe(true);
    expect(canTransition('SENT', 'PAID')).toBe(true);
    expect(canTransition('SENT', 'CANCELLED')).toBe(true);
  });

  it('заборонені', () => {
    expect(canTransition('DRAFT', 'PAID')).toBe(false);
    expect(canTransition('PAID', 'CANCELLED')).toBe(false);
    expect(canTransition('CANCELLED', 'SENT')).toBe(false);
    expect(() => assertTransition('PAID', 'SENT')).toThrow(InvalidTransitionError);
  });
});

describe('dates', () => {
  it('todayKyiv враховує часовий пояс Києва', () => {
    // 22:30 UTC 16.11 = 00:30 17.11 за Києвом (UTC+2 взимку)
    expect(toIsoDate(todayKyiv(new Date('2026-11-16T22:30:00Z')))).toBe('2026-11-17');
    expect(toIsoDate(todayKyiv(new Date('2026-11-16T21:30:00Z')))).toBe('2026-11-16');
  });

  it('форматування не зсуває дату', () => {
    expect(formatDate(today)).toBe('16.11.2026');
    expect(formatDateLong(today)).toBe('16 листопада 2026 р.');
    expect(toIsoDate(addDays(today, 7))).toBe('2026-11-23');
  });

  it('fromIsoDate відхиляє некоректний формат', () => {
    expect(() => fromIsoDate('16.11.2026')).toThrow(RangeError);
  });
});

describe('buildPaymentPurpose', () => {
  it('формулювання «згідно з рахунком»', () => {
    expect(buildPaymentPurpose({ number: 14, issueDate: today })).toBe(
      'Оплата за послуги згідно з рахунком № 14 від 16.11.2026 р., без ПДВ',
    );
  });
});
