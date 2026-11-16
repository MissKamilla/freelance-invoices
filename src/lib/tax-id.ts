/** Податкові коди: РНОКПП фізособи/ФОП (10 цифр) і ЄДРПОУ юрособи (8 цифр). */

const RNOKPP_WEIGHTS = [-1, 5, 7, 9, 4, 6, 10, 5, 7] as const;

/** РНОКПП: 10 цифр, остання — контрольна: (Σ dᵢ·wᵢ mod 11) mod 10. */
export function isValidRnokpp(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;

  const digits = [...value].map(Number);
  const sum = RNOKPP_WEIGHTS.reduce((acc, weight, i) => acc + weight * (digits[i] ?? 0), 0);
  const control = (((sum % 11) + 11) % 11) % 10;
  return control === digits[9];
}

/** ЄДРПОУ: перевіряємо лише формат (контрольна сума — у планах). */
export function isValidEdrpouFormat(value: string): boolean {
  return /^\d{8}$/.test(value);
}

/** Код клієнта: ЄДРПОУ (8 цифр) або РНОКПП (10 цифр з контрольною сумою). */
export function isValidClientTaxId(value: string): boolean {
  return isValidEdrpouFormat(value) || isValidRnokpp(value);
}
