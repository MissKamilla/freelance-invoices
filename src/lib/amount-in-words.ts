/** Сума прописом для рахунку: 2850000 → "Двадцять вісім тисяч п’ятсот гривень 00 копійок". */

type Gender = 'masculine' | 'feminine';
type Forms = readonly [one: string, few: string, many: string];

const UNITS_MASCULINE = ['', 'один', 'два', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять'];
const UNITS_FEMININE = ['', 'одна', 'дві', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять'];
const TEENS = [
  'десять',
  'одинадцять',
  'дванадцять',
  'тринадцять',
  'чотирнадцять',
  'п’ятнадцять',
  'шістнадцять',
  'сімнадцять',
  'вісімнадцять',
  'дев’ятнадцять',
];
const TENS = ['', '', 'двадцять', 'тридцять', 'сорок', 'п’ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев’яносто'];
const HUNDREDS = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п’ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев’ятсот'];

const HRYVNIA: Forms = ['гривня', 'гривні', 'гривень'];
const KOPIYKA: Forms = ['копійка', 'копійки', 'копійок'];

// Розряди від тисяч і вище: рід визначає «одна тисяча», але «один мільйон».
const SCALES: readonly { forms: Forms; gender: Gender }[] = [
  { forms: ['тисяча', 'тисячі', 'тисяч'], gender: 'feminine' },
  { forms: ['мільйон', 'мільйони', 'мільйонів'], gender: 'masculine' },
  { forms: ['мільярд', 'мільярди', 'мільярдів'], gender: 'masculine' },
];

/** 1 гривня, 2–4 гривні, 5–20 гривень; 11–14 — завжди «гривень». */
export function pluralUk(n: number, forms: Forms): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function tripletToWords(n: number, gender: Gender): string[] {
  const words: string[] = [];
  const units = gender === 'feminine' ? UNITS_FEMININE : UNITS_MASCULINE;
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds) words.push(HUNDREDS[hundreds]!);
  if (rest >= 10 && rest < 20) {
    words.push(TEENS[rest - 10]!);
  } else {
    const tens = Math.floor(rest / 10);
    const unit = rest % 10;
    if (tens) words.push(TENS[tens]!);
    if (unit) words.push(units[unit]!);
  }
  return words;
}

/** Ціле число гривень словами (жіночий рід для одиниць: «одна гривня»). */
export function integerToWordsUk(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`Invalid amount: ${value}`);
  if (value === 0) return 'нуль';

  const words: string[] = [];
  const triplets: number[] = [];
  for (let rest = value; rest > 0; rest = Math.floor(rest / 1000)) triplets.push(rest % 1000);
  if (triplets.length > SCALES.length + 1) throw new RangeError(`Amount too large: ${value}`);

  for (let i = triplets.length - 1; i >= 0; i--) {
    const triplet = triplets[i]!;
    if (triplet === 0) continue;
    if (i === 0) {
      words.push(...tripletToWords(triplet, 'feminine'));
    } else {
      const scale = SCALES[i - 1]!;
      words.push(...tripletToWords(triplet, scale.gender), pluralUk(triplet, scale.forms));
    }
  }
  return words.join(' ');
}

export function amountInWordsUk(kopecks: number): string {
  if (!Number.isSafeInteger(kopecks) || kopecks < 0) throw new RangeError(`Invalid amount: ${kopecks}`);
  const hryvnias = Math.floor(kopecks / 100);
  const coins = kopecks % 100;

  const text = `${integerToWordsUk(hryvnias)} ${pluralUk(hryvnias, HRYVNIA)} ${String(coins).padStart(2, '0')} ${pluralUk(coins, KOPIYKA)}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
