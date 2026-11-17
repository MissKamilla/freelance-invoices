import { describe, expect, it } from 'vitest';
import { formatAmount, formatMoney, formatQuantity, parseMoney, parseQuantity, toMoneyInput } from './money';
import { calcLineAmount, calcTotal } from './invoice-calc';

// Intl ставить нерозривні пробіли між тисячами — порівнюємо зі звичайними.
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('parseMoney', () => {
  it.each([
    ['12 500,50', 1_250_050],
    ['12500.5', 1_250_050],
    ['12 500', 1_250_000],
    ['0,01', 1],
    ['1000', 100_000],
    [' 7,5 ', 750],
  ])('%s → %i', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1,234', '1.2.3', '1,5,0'])('відхиляє «%s»', (input) => {
    expect(parseMoney(input)).toBeNull();
  });

  it('не втрачає точність там, де float помиляється', () => {
    // 0.1 + 0.2 у float = 0.30000000000000004, у копійках — точно 30
    expect((parseMoney('0,1') ?? 0) + (parseMoney('0,2') ?? 0)).toBe(30);
    expect(parseMoney('1,15')).toBe(115); // 1.15 * 100 у float = 114.99999999999999
  });
});

describe('formatMoney / formatAmount', () => {
  it('формат uk-UA з гривнею', () => {
    expect(plain(formatMoney(1_250_050))).toBe('12 500,50 ₴');
    expect(plain(formatAmount(100))).toBe('1,00');
    expect(plain(formatMoney(0))).toBe('0,00 ₴');
  });
});

describe('toMoneyInput', () => {
  it('рядок для поля вводу без розділювачів тисяч', () => {
    expect(toMoneyInput(1_250_050)).toBe('12500,50');
    expect(toMoneyInput(5)).toBe('0,05');
  });
});

describe('quantity', () => {
  it('парсить і форматує соті', () => {
    expect(parseQuantity('1,5')).toBe(150);
    expect(parseQuantity('3')).toBe(300);
    expect(formatQuantity(150)).toBe('1,5');
    expect(formatQuantity(125)).toBe('1,25');
    expect(formatQuantity(300)).toBe('3');
    expect(formatQuantity(5)).toBe('0,05');
  });
});

describe('invoice-calc', () => {
  it('сума позиції: кількість × ціна з округленням до копійки', () => {
    expect(calcLineAmount(150, 100_000)).toBe(150_000); // 1,5 год × 1000 грн
    expect(calcLineAmount(33, 1_001)).toBe(330); // 0,33 × 10,01 = 3,3033 → 3,30
    expect(calcLineAmount(50, 1)).toBe(1); // 0,5 × 0,01 = 0,005 → 0,01 (округлення половини вгору)
  });

  it('загальна сума — сума позицій після округлення кожної', () => {
    expect(
      calcTotal([
        { quantityHundredths: 100, unitPrice: 2_500_000 },
        { quantityHundredths: 350, unitPrice: 100_000 },
      ]),
    ).toBe(2_850_000);
    expect(calcTotal([])).toBe(0);
  });
});
