import { describe, expect, it } from 'vitest';
import { amountInWordsUk, integerToWordsUk, pluralUk } from './amount-in-words';

const грн = (hryvnias: number, kopecks = 0) => hryvnias * 100 + kopecks;

describe('amountInWordsUk', () => {
  it.each([
    [грн(0), 'Нуль гривень 00 копійок'],
    [грн(1), 'Одна гривня 00 копійок'],
    [грн(2), 'Дві гривні 00 копійок'],
    [грн(5), 'П’ять гривень 00 копійок'],
    [грн(11), 'Одинадцять гривень 00 копійок'],
    [грн(14), 'Чотирнадцять гривень 00 копійок'],
    [грн(21), 'Двадцять одна гривня 00 копійок'],
    [грн(112), 'Сто дванадцять гривень 00 копійок'],
    [грн(1000), 'Одна тисяча гривень 00 копійок'],
    [грн(2001), 'Дві тисячі одна гривня 00 копійок'],
    [грн(5000), 'П’ять тисяч гривень 00 копійок'],
    [грн(11_000), 'Одинадцять тисяч гривень 00 копійок'],
    [грн(28_500), 'Двадцять вісім тисяч п’ятсот гривень 00 копійок'],
    [грн(1_000_000), 'Один мільйон гривень 00 копійок'],
    [грн(2_345_678), 'Два мільйони триста сорок п’ять тисяч шістсот сімдесят вісім гривень 00 копійок'],
  ])('%i коп. → %s', (kopecks, expected) => {
    expect(amountInWordsUk(kopecks)).toBe(expected);
  });

  it('копійки цифрами з правильним відмінюванням', () => {
    expect(amountInWordsUk(грн(10, 1))).toBe('Десять гривень 01 копійка');
    expect(amountInWordsUk(грн(10, 2))).toBe('Десять гривень 02 копійки');
    expect(amountInWordsUk(грн(10, 11))).toBe('Десять гривень 11 копійок');
    expect(amountInWordsUk(грн(10, 21))).toBe('Десять гривень 21 копійка');
    expect(amountInWordsUk(грн(10, 99))).toBe('Десять гривень 99 копійок');
  });

  it('відхиляє від’ємні та дробові значення', () => {
    expect(() => amountInWordsUk(-1)).toThrow(RangeError);
    expect(() => amountInWordsUk(1.5)).toThrow(RangeError);
  });
});

describe('integerToWordsUk', () => {
  it('пропускає порожні розряди', () => {
    expect(integerToWordsUk(1_000_001)).toBe('один мільйон одна');
    expect(integerToWordsUk(100_000)).toBe('сто тисяч');
  });
});

describe('pluralUk', () => {
  const forms = ['день', 'дні', 'днів'] as const;
  it.each([
    [1, 'день'],
    [3, 'дні'],
    [5, 'днів'],
    [12, 'днів'],
    [22, 'дні'],
    [111, 'днів'],
    [101, 'день'],
  ])('%i → %s', (n, expected) => {
    expect(pluralUk(n, forms)).toBe(expected);
  });
});
