import { describe, expect, it } from 'vitest';
import {
  buildNbuQrPayload,
  buildNbuQrUrl,
  buildQrMatrix,
  encodeCp1251,
  formatNbuAmount,
  NBU_QR_PREFIX,
} from './nbu-qr';

// Приклад 1 з додатка 3 до Правил НБУ (постанова № 97): «Обслуговування в стоматологічній клініці».
const NBU_EXAMPLE = {
  recipient: 'ТОВ “Стоматологія”',
  iban: 'UA783226690000026005012107358',
  amount: 103_428,
  recipientCode: '40723824',
  purpose: 'Стоматологічні послуги',
};
const NBU_EXAMPLE_ENCODED =
  'QkNECjAwMgoyClVDVAoK0s7CIJPR8u7s4PLu6-7js_-UClVBNzgzMjI2NjkwMDAwMDI2MDA1MDEyMTA3MzU4ClVBSDEwMzQuMjgKNDA3MjM4MjQKCgrR8u7s4PLu6-7js_ftsyDv7vHr8-PoCg';

describe('buildNbuQrUrl', () => {
  it('збігається з еталонним прикладом НБУ байт у байт', () => {
    expect(buildNbuQrUrl(NBU_EXAMPLE)).toBe(NBU_QR_PREFIX + NBU_EXAMPLE_ENCODED);
  });

  it('відхиляє дані, довші за ліміти полів', () => {
    expect(() => buildNbuQrUrl({ ...NBU_EXAMPLE, recipient: 'Я'.repeat(141) })).toThrow(RangeError);
    expect(() => buildNbuQrUrl({ ...NBU_EXAMPLE, purpose: 'Я'.repeat(421) })).toThrow(RangeError);
  });
});

describe('buildNbuQrPayload', () => {
  it('порожня сума — порожній рядок (платник введе суму сам)', () => {
    const lines = buildNbuQrPayload({ ...NBU_EXAMPLE, amount: undefined }).split('\n');
    expect(lines[7]).toBe('');
  });

  it('переноси рядків у полях замінюються пробілами', () => {
    const payload = buildNbuQrPayload({ ...NBU_EXAMPLE, purpose: 'Оплата\nза послуги' });
    expect(payload.split('\n')[11]).toBe('Оплата за послуги');
  });
});

describe('formatNbuAmount', () => {
  it.each([
    [103_428, 'UAH1034.28'],
    [300, 'UAH3'],
    [305, 'UAH3.05'],
    [2_850_000, 'UAH28500'],
  ])('%i → %s', (kopecks, expected) => {
    expect(formatNbuAmount(kopecks)).toBe(expected);
  });
});

describe('encodeCp1251', () => {
  it('кодує українські літери й типографські символи', () => {
    expect([...encodeCp1251('ЄІЇҐєіїґ№’')]).toEqual([0xaa, 0xb2, 0xaf, 0xa5, 0xba, 0xb3, 0xbf, 0xb4, 0xb9, 0x92]);
  });

  it('нерозривний пробіл → звичайний, невідомий символ → «?»', () => {
    expect([...encodeCp1251('1\u00A0000\u202F😀')]).toEqual([0x31, 0x20, 0x30, 0x30, 0x30, 0x20, 0x3f]);
  });
});

describe('buildQrMatrix', () => {
  it('версія не менша за 10, коло під знаком гривні за таблицею НБУ', () => {
    const matrix = buildQrMatrix(buildNbuQrUrl(NBU_EXAMPLE));
    expect(matrix.version).toBeGreaterThanOrEqual(10);
    expect(matrix.version).toBeLessThanOrEqual(17);
    expect(matrix.size).toBe(matrix.version * 4 + 17);
    expect(matrix.circleDiameter).toBeGreaterThanOrEqual(17);
  });
});
