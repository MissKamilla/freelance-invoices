/** Українські IBAN: UA + 2 контрольні цифри + 6 цифр МФО банку + 19 цифр рахунку. */

export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/** Перевірка формату UA + 27 цифр і контрольної суми ISO 13616 (mod 97 = 1). */
export function isValidUaIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^UA\d{27}$/.test(iban)) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** "UA213223130000026007233566001" → "UA21 3223 1300 0002 6007 2335 6600 1" */
export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})(?=.)/g, '$1 ');
}

export function mfoFromIban(value: string): string | null {
  const iban = normalizeIban(value);
  return /^UA\d{27}$/.test(iban) ? iban.slice(4, 10) : null;
}

// Найпоширеніші банки — лише для підказки в формі, користувач може змінити назву.
const BANKS_BY_MFO: Record<string, string> = {
  '305299': 'АТ КБ «ПриватБанк»',
  '322001': 'АТ «Універсал Банк» (monobank)',
  '300465': 'АТ «Ощадбанк»',
  '334851': 'АТ «ПУМБ»',
  '380805': 'АТ «Райффайзен Банк»',
  '307770': 'АТ «А-Банк»',
  '300346': 'АТ «Сенс Банк»',
  '351005': 'АТ «УкрСиббанк»',
  '300528': 'АТ «ОТП Банк»',
  '320478': 'АБ «Укргазбанк»',
};

export function bankNameFromIban(value: string): string | null {
  const mfo = mfoFromIban(value);
  return mfo ? (BANKS_BY_MFO[mfo] ?? null) : null;
}
