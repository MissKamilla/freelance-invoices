/**
 * Гроші — лише цілі копійки (Int). Кількість у позиціях — цілі соті (1,5 → 150).
 * Жодних float у розрахунках: парсимо рядки посимвольно.
 */

/** 10 млн грн — верхня межа суми рахунку (вміщується в Postgres Int з запасом). */
export const MAX_INVOICE_TOTAL = 1_000_000_000;

// \s у JS покриває й нерозривні пробіли (U+00A0, U+202F), які ставить Intl.
const SPACES = /\s/g;

function parseFixed2(input: string): number | null {
  const normalized = input.replace(SPACES, '').replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  const result = whole * 100 + fraction;
  return Number.isSafeInteger(result) ? result : null;
}

/** "12 500,50" → 1250050 копійок; null, якщо формат некоректний. */
export function parseMoney(input: string): number | null {
  return parseFixed2(input);
}

/** "1,5" → 150 (соті). */
export function parseQuantity(input: string): number | null {
  return parseFixed2(input);
}

const amountFormatter = new Intl.NumberFormat('uk-UA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1250050 → "12 500,50" */
export function formatAmount(kopecks: number): string {
  return amountFormatter.format(kopecks / 100);
}

/** 1250050 → "12 500,50 ₴" */
export function formatMoney(kopecks: number): string {
  return `${formatAmount(kopecks)} ₴`;
}

/** Значення для поля вводу: 1250050 → "12500,50" (без розділювачів тисяч). */
export function toMoneyInput(kopecks: number): string {
  const whole = Math.trunc(kopecks / 100);
  const fraction = String(kopecks % 100).padStart(2, '0');
  return `${whole},${fraction}`;
}

/** 150 → "1,5"; 300 → "3" */
export function formatQuantity(hundredths: number): string {
  const whole = Math.trunc(hundredths / 100);
  const fraction = hundredths % 100;
  if (fraction === 0) return String(whole);
  return `${whole},${String(fraction).padStart(2, '0').replace(/0$/, '')}`;
}
