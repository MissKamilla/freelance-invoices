/**
 * Платіжний QR-код НБУ, версія формату 002 (Правила, затверджені постановою НБУ № 97 від 19.08.2025, додаток 3).
 * Формат 002 читають застосунки всіх банків; 003 підтримується ще не скрізь.
 *
 * Структура: рядки BCD / 002 / кодування / UCT / BIC / отримувач / IBAN / сума / код / ціль / reference /
 * призначення / дисплей, кожен закінчується LF. Порожній останній «дисплей» не пишемо — як в еталонному
 * прикладі НБУ. Байти в Win1251 (кодування «2»), далі Base64URL без «=» після префікса https://bank.gov.ua/qr/.
 */
import QRCode from 'qrcode';

export const NBU_QR_PREFIX = 'https://bank.gov.ua/qr/';
const MAX_QR_DATA_BYTES = 507;
const MIN_QR_VERSION = 10;
const MAX_QR_VERSION = 17;

export type NbuQrInput = {
  recipient: string;
  iban: string;
  recipientCode: string;
  purpose: string;
  /** Копійки; без суми платник вводить її сам. */
  amount?: number;
};

// Win1251: будуємо таблицю «символ → байт» з вбудованого декодера, без сторонніх бібліотек.
const CP1251 = (() => {
  const decoder = new TextDecoder('windows-1251');
  const table = new Map<string, number>();
  for (let byte = 0x20; byte <= 0xff; byte++) {
    // Правила НБУ забороняють 0x7F, 0x98 і 0xA0 (нерозривний пробіл).
    if (byte === 0x7f || byte === 0x98 || byte === 0xa0) continue;
    table.set(decoder.decode(new Uint8Array([byte])), byte);
  }
  return table;
})();

/** Текст → байти Win1251. Нерозривні пробіли стають звичайними, невідомі символи — «?». */
export function encodeCp1251(text: string): Uint8Array {
  const normalized = text.replace(/[\u00A0\u202F]/g, ' ');
  return Uint8Array.from([...normalized].map((ch) => (ch === '\n' ? 0x0a : (CP1251.get(ch) ?? 0x3f))));
}

/** 103428 → "UAH1034.28"; 300 → "UAH3" (НБУ вимагає найкоротший запис). */
export function formatNbuAmount(kopecks: number): string {
  if (!Number.isSafeInteger(kopecks) || kopecks <= 0) throw new RangeError(`Invalid amount: ${kopecks}`);
  const hryvnias = Math.floor(kopecks / 100);
  const coins = kopecks % 100;
  return coins === 0 ? `UAH${hryvnias}` : `UAH${hryvnias}.${String(coins).padStart(2, '0')}`;
}

function oneLine(value: string, max: number, field: string): string {
  const clean = value.replace(/[\r\n]+/g, ' ').trim();
  if (clean.length > max) throw new RangeError(`${field} is longer than ${max} characters`);
  return clean;
}

/** Відкрита (нерозкодована) структура даних QR-коду. */
export function buildNbuQrPayload(input: NbuQrInput): string {
  const fields = [
    'BCD',
    '002',
    '2', // Win1251
    'UCT',
    '', // BIC — зарезервовано
    oneLine(input.recipient, 140, 'recipient'),
    oneLine(input.iban, 29, 'iban'),
    input.amount ? formatNbuAmount(input.amount) : '',
    oneLine(input.recipientCode, 10, 'recipientCode'),
    '', // Ціль — зарезервовано
    '', // Reference — зарезервовано
    oneLine(input.purpose, 420, 'purpose'),
  ];
  return fields.map((field) => `${field}\n`).join('');
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function buildNbuQrUrl(input: NbuQrInput): string {
  const url = NBU_QR_PREFIX + toBase64Url(encodeCp1251(buildNbuQrPayload(input)));
  if (url.length > MAX_QR_DATA_BYTES) throw new RangeError('QR data exceeds 507 bytes');
  return url;
}

export type QrMatrix = {
  /** Кількість модулів по стороні. */
  size: number;
  version: number;
  /** true — темний модуль. */
  isDark: (row: number, col: number) => boolean;
  /** Діаметр білого кола під знаком гривні (у модулях), за п. 11 додатка 1 до Правил. */
  circleDiameter: number;
};

function circleDiameterFor(version: number): number {
  if (version <= 10) return 17;
  if (version <= 12) return 19;
  if (version === 13) return 21;
  if (version <= 15) return 23;
  return 25;
}

/** Матриця QR: рівень корекції Q (з логотипом рівень L заборонено), версія 10–17. */
export function buildQrMatrix(text: string): QrMatrix {
  let qr = QRCode.create(text, { errorCorrectionLevel: 'Q' });
  if (qr.version < MIN_QR_VERSION) {
    qr = QRCode.create(text, { errorCorrectionLevel: 'Q', version: MIN_QR_VERSION });
  }
  if (qr.version > MAX_QR_VERSION) throw new RangeError(`QR version ${qr.version} exceeds ${MAX_QR_VERSION}`);

  const { size } = qr.modules;
  return {
    size,
    version: qr.version,
    isDark: (row, col) => Boolean(qr.modules.get(row, col)),
    circleDiameter: circleDiameterFor(qr.version),
  };
}
