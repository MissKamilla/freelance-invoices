import { describe, expect, it } from 'vitest';
import { addDays, formatDate, formatDateLong, formatDateTime, fromIsoDate, todayKyiv, toIsoDate } from './dates';

describe('fromIsoDate / toIsoDate', () => {
  it('зберігає календарний день як UTC-північ і повертає його без зсуву', () => {
    const date = fromIsoDate('2026-11-16');
    expect(date.toISOString()).toBe('2026-11-16T00:00:00.000Z');
    expect(toIsoDate(date)).toBe('2026-11-16');
  });

  it('відхиляє рядки не у форматі YYYY-MM-DD', () => {
    expect(() => fromIsoDate('16.11.2026')).toThrow(RangeError);
    expect(() => fromIsoDate('2026-11-16T10:00:00Z')).toThrow(RangeError);
  });
});

describe('todayKyiv', () => {
  it('пізно ввечері за UTC у Києві вже наступний день', () => {
    // 16.11 23:30 UTC = 17.11 01:30 за Києвом (UTC+2 взимку)
    expect(toIsoDate(todayKyiv(new Date('2026-11-16T23:30:00Z')))).toBe('2026-11-17');
    // 16.11 21:30 UTC влітку = 17.11 00:30 за Києвом (UTC+3)
    expect(toIsoDate(todayKyiv(new Date('2026-07-16T21:30:00Z')))).toBe('2026-07-17');
    // а взимку о 21:30 UTC ще 16.11
    expect(toIsoDate(todayKyiv(new Date('2026-11-16T21:30:00Z')))).toBe('2026-11-16');
  });
});

describe('addDays', () => {
  it('додає календарні дні до UTC-півночі', () => {
    expect(toIsoDate(addDays(fromIsoDate('2026-02-27'), 3))).toBe('2026-03-02');
    expect(toIsoDate(addDays(fromIsoDate('2026-01-01'), -1))).toBe('2025-12-31');
  });
});

describe('форматування', () => {
  const date = fromIsoDate('2026-11-16');
  it('коротка й довга дата з timeZone UTC — без «з’їжджання» на день', () => {
    expect(formatDate(date)).toBe('16.11.2026');
    expect(formatDateLong(date)).toBe('16 листопада 2026 р.');
  });

  it('момент часу показується за Києвом', () => {
    expect(formatDateTime(new Date('2026-11-16T12:32:00Z')).replace(/\s/g, ' ')).toBe('16.11.2026, 14:32');
  });
});
