import { describe, expect, it } from 'vitest';
import { atKyivTime, fromIsoDate, kyivOffsetMinutes } from './dates';
import { planReminders } from './reminders';

describe('atKyivTime', () => {
  it('враховує зимовий і літній час', () => {
    expect(kyivOffsetMinutes(new Date('2026-11-16T12:00:00Z'))).toBe(120);
    expect(kyivOffsetMinutes(new Date('2026-07-16T12:00:00Z'))).toBe(180);
    expect(atKyivTime(fromIsoDate('2026-11-17'), 10).toISOString()).toBe('2026-11-17T08:00:00.000Z');
    expect(atKyivTime(fromIsoDate('2026-07-17'), 10).toISOString()).toBe('2026-07-17T07:00:00.000Z');
  });
});

describe('planReminders', () => {
  const dueDate = fromIsoDate('2026-11-23');
  const issuedAt = new Date('2026-11-16T09:00:00Z');

  it('за день до терміну й наступного дня після, о 10:00 за Києвом', () => {
    const plan = planReminders({ dueDate, issuedAt, now: issuedAt, demo: false });
    expect(plan.beforeDue?.toISOString()).toBe('2026-11-22T08:00:00.000Z');
    expect(plan.overdue.toISOString()).toBe('2026-11-24T08:00:00.000Z');
  });

  it('пропускає нагадування «до терміну», якщо його час уже минув', () => {
    const plan = planReminders({ dueDate: fromIsoDate('2026-11-16'), issuedAt, now: issuedAt, demo: false });
    expect(plan.beforeDue).toBeNull();
    expect(plan.overdue.toISOString()).toBe('2026-11-17T08:00:00.000Z');
  });

  it('демо-режим: через 1 і 2 хвилини після виставлення', () => {
    const plan = planReminders({ dueDate, issuedAt, now: issuedAt, demo: true });
    expect(plan.beforeDue?.toISOString()).toBe('2026-11-16T09:01:00.000Z');
    expect(plan.overdue.toISOString()).toBe('2026-11-16T09:02:00.000Z');
  });
});
