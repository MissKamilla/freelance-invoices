import { z } from 'zod';
import { calcTotal } from '@/lib/invoice-calc';
import { MAX_INVOICE_TOTAL, MAX_QUANTITY_HUNDREDTHS, MAX_UNIT_PRICE, parseMoney, parseQuantity } from '@/lib/money';

export const UNITS = ['послуга', 'год', 'день', 'міс', 'шт'] as const;

/**
 * Рядок із поля вводу → ціле число (копійки або соті); помилка, якщо формат некоректний, ≤ 0 або більше за max.
 * Верхня межа потрібна окремо від підсумку: «0,01 × 50 000 000 ₴» дає малий підсумок, але не вміщується в Int.
 */
const positiveFixed2 = (parse: (v: string) => number | null, message: string, max: number) =>
  z.string().transform((value, ctx) => {
    const parsed = parse(value);
    if (parsed === null || parsed <= 0) {
      ctx.addIssue({ code: 'custom', message });
      return z.NEVER;
    }
    if (parsed > max) {
      ctx.addIssue({ code: 'custom', message: 'Занадто велике значення' });
      return z.NEVER;
    }
    return parsed;
  });

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(2, 'Опишіть послугу').max(300, 'Не більше 300 символів'),
  unit: z.string().trim().min(1, 'Одиниця').max(20),
  quantity: positiveFixed2(parseQuantity, 'Напр. 1 або 1,5', MAX_QUANTITY_HUNDREDTHS),
  unitPrice: positiveFixed2(parseMoney, 'Напр. 1000 або 1000,50', MAX_UNIT_PRICE),
});

export const invoiceDraftSchema = z
  .object({
    clientId: z.string().min(1, 'Оберіть клієнта'),
    dueDate: z.iso.date('Вкажіть термін оплати'),
    contractRef: z.string().trim().max(120, 'Не більше 120 символів'),
    notes: z.string().trim().max(1000, 'Не більше 1000 символів'),
    items: z.array(invoiceItemSchema).min(1, 'Додайте хоча б одну позицію').max(50, 'Не більше 50 позицій'),
  })
  .refine(
    (data) =>
      calcTotal(data.items.map((i) => ({ quantityHundredths: i.quantity, unitPrice: i.unitPrice }))) <=
      MAX_INVOICE_TOTAL,
    { message: 'Сума рахунку не може перевищувати 10 000 000 ₴', path: ['items'] },
  );

export type InvoiceDraftInput = z.input<typeof invoiceDraftSchema>;
export type InvoiceDraftData = z.output<typeof invoiceDraftSchema>;
export type InvoiceItemInput = z.input<typeof invoiceItemSchema>;

export const emptyItem: InvoiceItemInput = { description: '', unit: 'послуга', quantity: '1', unitPrice: '' };
