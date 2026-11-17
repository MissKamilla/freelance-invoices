import { z } from 'zod';
import { isValidClientTaxId } from '@/lib/tax-id';

const optionalText = (max: number) => z.string().trim().max(max, `Не більше ${max} символів`);

export const clientSchema = z.object({
  name: z.string().trim().min(2, 'Вкажіть назву клієнта').max(140, 'Не більше 140 символів'),
  taxId: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidClientTaxId(v), 'ЄДРПОУ (8 цифр) або РНОКПП (10 цифр)'),
  email: z.email('Вкажіть коректний email — на нього надсилатимемо рахунки'),
  address: optionalText(200),
  notes: optionalText(500),
});

export type ClientFormInput = z.input<typeof clientSchema>;
export type ClientData = z.output<typeof clientSchema>;

export const emptyClient: ClientFormInput = { name: '', taxId: '', email: '', address: '', notes: '' };
