import { z } from 'zod';
import { isValidUaIban, normalizeIban } from '@/lib/iban';
import { isValidRnokpp } from '@/lib/tax-id';

export const DEFAULT_TAX_NOTE = 'Платник єдиного податку 3 групи, не платник ПДВ';

export const profileSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(3, 'Вкажіть ПІБ, наприклад «ФОП Іваненко Олена Петрівна»')
    .max(140, 'Не більше 140 символів'),
  taxId: z.string().trim().refine(isValidRnokpp, 'РНОКПП — 10 цифр з правильною контрольною цифрою'),
  iban: z
    .string()
    .transform(normalizeIban)
    .refine(isValidUaIban, 'Некоректний IBAN: UA + 27 цифр з правильною контрольною сумою'),
  bankName: z.string().trim().min(2, 'Вкажіть банк').max(120),
  address: z.string().trim().min(5, 'Вкажіть адресу').max(200),
  phone: z.string().trim().max(30, 'Не більше 30 символів'),
  taxNote: z.string().trim().min(3, 'Вкажіть податковий статус').max(200),
  defaultDueDays: z
    .number({ error: 'Вкажіть кількість днів' })
    .int()
    .min(1, 'Від 1 до 90 днів')
    .max(90, 'Від 1 до 90 днів'),
});

export type ProfileFormInput = z.input<typeof profileSchema>;
export type ProfileData = z.output<typeof profileSchema>;
