import { describe, expect, it } from 'vitest';
import { bankNameFromIban, formatIban, isValidUaIban, mfoFromIban, normalizeIban } from './iban';

// Вигадані рахунки з правильною контрольною сумою (пораховано незалежно).
const MONO_IBAN = 'UA573220010000026007233566001';
const PRIVAT_IBAN = 'UA743052990000026007233566001';

describe('normalizeIban', () => {
  it('прибирає пробіли й піднімає регістр', () => {
    expect(normalizeIban(' ua57 3220 0100 0002 6007 2335 6600 1 ')).toBe(MONO_IBAN);
  });
});

describe('isValidUaIban', () => {
  it('приймає коректні IBAN, у т.ч. з пробілами', () => {
    expect(isValidUaIban(MONO_IBAN)).toBe(true);
    expect(isValidUaIban(PRIVAT_IBAN)).toBe(true);
    expect(isValidUaIban('UA57 3220 0100 0002 6007 2335 6600 1')).toBe(true);
  });

  it('відхиляє IBAN з помилкою в одній цифрі', () => {
    expect(isValidUaIban('UA573220010000026007233566002')).toBe(false);
    expect(isValidUaIban('UA583220010000026007233566001')).toBe(false);
  });

  it('відхиляє неправильну довжину та чужі країни', () => {
    expect(isValidUaIban('UA57322001000002600723356600')).toBe(false);
    expect(isValidUaIban('DE89370400440532013000')).toBe(false);
    expect(isValidUaIban('')).toBe(false);
  });
});

describe('formatIban', () => {
  it('групує по 4 символи', () => {
    expect(formatIban(MONO_IBAN)).toBe('UA57 3220 0100 0002 6007 2335 6600 1');
  });
});

describe('mfoFromIban / bankNameFromIban', () => {
  it('дістає МФО і підказує назву банку', () => {
    expect(mfoFromIban(MONO_IBAN)).toBe('322001');
    expect(bankNameFromIban(MONO_IBAN)).toContain('monobank');
    expect(bankNameFromIban(PRIVAT_IBAN)).toContain('ПриватБанк');
  });

  it('повертає null для невідомого банку або некоректного IBAN', () => {
    expect(bankNameFromIban('UA00999999' + '0'.repeat(19))).toBeNull();
    expect(mfoFromIban('not-an-iban')).toBeNull();
  });
});
