/**
 * Календарні дати рахунку (дата складання, термін оплати) зберігаються як @db.Date —
 * UTC-північ календарного дня за Києвом. Форматуємо їх з timeZone: 'UTC', щоб дата не «з'їжджала».
 */

export const KYIV_TZ = 'Europe/Kyiv';

const isoDayInKyiv = new Intl.DateTimeFormat('en-CA', { timeZone: KYIV_TZ });

/** 'YYYY-MM-DD' → Date (UTC-північ). */
export function fromIsoDate(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new RangeError(`Invalid ISO date: ${iso}`);
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Date (UTC-північ) → 'YYYY-MM-DD'. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Сьогоднішня дата за Києвом як UTC-північ. */
export function todayKyiv(now: Date = new Date()): Date {
  return fromIsoDate(isoDayInKyiv.format(now));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

const shortDate = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const longDate = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const dateTimeKyiv = new Intl.DateTimeFormat('uk-UA', {
  timeZone: KYIV_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** 16.11.2026 */
export function formatDate(date: Date): string {
  return shortDate.format(date);
}

/** 16 листопада 2026 р. */
export function formatDateLong(date: Date): string {
  return longDate.format(date);
}

/** Момент часу за Києвом: 16.11.2026, 14:32 */
export function formatDateTime(date: Date): string {
  return dateTimeKyiv.format(date);
}

const kyivOffsetFormat = new Intl.DateTimeFormat('en-US', { timeZone: KYIV_TZ, timeZoneName: 'longOffset' });

/** Зсув Києва від UTC у хвилинах на заданий момент (120 взимку, 180 влітку). */
export function kyivOffsetMinutes(moment: Date): number {
  const name = kyivOffsetFormat.formatToParts(moment).find((p) => p.type === 'timeZoneName')?.value ?? '';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

/** Календарний день (UTC-північ) + година за Києвом → момент часу. */
export function atKyivTime(day: Date, hour: number): Date {
  const naive = new Date(day.getTime() + hour * 3_600_000);
  return new Date(naive.getTime() - kyivOffsetMinutes(naive) * 60_000);
}
