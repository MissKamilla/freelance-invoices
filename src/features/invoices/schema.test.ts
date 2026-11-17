import { describe, expect, it } from 'vitest';
import { invoiceDraftSchema, invoiceItemSchema } from './schema';

const item = (overrides: Partial<{ quantity: string; unitPrice: string }> = {}) => ({
  description: 'Дизайн лендінгу',
  unit: 'послуга',
  quantity: '1',
  unitPrice: '25 000,00',
  ...overrides,
});

const draft = (items: ReturnType<typeof item>[]) => ({
  clientId: 'client_1',
  dueDate: '2026-11-23',
  contractRef: '',
  notes: '',
  items,
});

const messagesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues.map((i) => i.message) ?? []);

describe('invoiceItemSchema', () => {
  it('перетворює рядки з комою на цілі соті й копійки', () => {
    expect(invoiceItemSchema.parse(item({ quantity: '1,5', unitPrice: '1 000,50' }))).toMatchObject({
      quantity: 150,
      unitPrice: 100_050,
    });
  });

  it('відхиляє нуль, від’ємні та некоректні значення', () => {
    expect(messagesOf(invoiceItemSchema.safeParse(item({ quantity: '0' })))).toContain('Напр. 1 або 1,5');
    expect(messagesOf(invoiceItemSchema.safeParse(item({ unitPrice: '-5' })))).toContain('Напр. 1000 або 1000,50');
    expect(messagesOf(invoiceItemSchema.safeParse(item({ unitPrice: '1,234' })))).toContain('Напр. 1000 або 1000,50');
  });

  it('відхиляє ціну й кількість, що не вміщуються в Postgres Int, навіть якщо підсумок малий', () => {
    // 0,01 × 50 000 000 ₴ = 500 000 ₴ — підсумок у межах, але unitPrice = 5 000 000 000 копійок > 2^31.
    expect(messagesOf(invoiceItemSchema.safeParse(item({ quantity: '0,01', unitPrice: '50000000' })))).toContain(
      'Занадто велике значення',
    );
    expect(messagesOf(invoiceItemSchema.safeParse(item({ quantity: '30000000', unitPrice: '0,01' })))).toContain(
      'Занадто велике значення',
    );
  });
});

describe('invoiceDraftSchema', () => {
  it('приймає коректну чернетку', () => {
    expect(invoiceDraftSchema.safeParse(draft([item(), item({ quantity: '3,5', unitPrice: '1000' })])).success).toBe(
      true,
    );
  });

  it('обмежує підсумок рахунку 10 000 000 ₴', () => {
    const result = invoiceDraftSchema.safeParse(draft([item({ quantity: '2', unitPrice: '6000000' })]));
    expect(messagesOf(result)).toContain('Сума рахунку не може перевищувати 10 000 000 ₴');
  });

  it('вимагає клієнта й хоча б одну позицію', () => {
    const result = invoiceDraftSchema.safeParse({ ...draft([]), clientId: '' });
    expect(messagesOf(result)).toEqual(expect.arrayContaining(['Оберіть клієнта', 'Додайте хоча б одну позицію']));
  });
});
