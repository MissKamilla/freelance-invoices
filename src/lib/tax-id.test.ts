import { describe, expect, it } from 'vitest';
import { isValidClientTaxId, isValidEdrpouFormat, isValidRnokpp } from './tax-id';

describe('isValidRnokpp', () => {
  // 1·(−1) + 2·5 + 3·7 + 4·9 + 5·4 + 6·6 + 7·10 + 8·5 + 9·7 = 295; 295 mod 11 = 9 → контрольна 9
  it('приймає код з правильною контрольною цифрою', () => {
    expect(isValidRnokpp('1234567899')).toBe(true);
  });

  it('відхиляє код з неправильною контрольною цифрою', () => {
    expect(isValidRnokpp('1234567890')).toBe(false);
  });

  it('контрольна 10 перетворюється на 0', () => {
    // d9 = 3 з вагою 7 → сума 21; 21 mod 11 = 10 → 10 mod 10 = 0
    expect(isValidRnokpp('0000000030')).toBe(true);
  });

  it('відхиляє не 10 цифр', () => {
    expect(isValidRnokpp('123456789')).toBe(false);
    expect(isValidRnokpp('12345678999')).toBe(false);
    expect(isValidRnokpp('12345678a9')).toBe(false);
  });
});

describe('isValidEdrpouFormat', () => {
  it('8 цифр', () => {
    expect(isValidEdrpouFormat('12345678')).toBe(true);
    expect(isValidEdrpouFormat('1234567')).toBe(false);
  });
});

describe('isValidClientTaxId', () => {
  it('приймає ЄДРПОУ або валідний РНОКПП', () => {
    expect(isValidClientTaxId('12345678')).toBe(true);
    expect(isValidClientTaxId('1234567899')).toBe(true);
    expect(isValidClientTaxId('1234567890')).toBe(false);
  });
});
