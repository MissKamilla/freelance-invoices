export type CalcItem = { quantityHundredths: number; unitPrice: number };

/** Сума позиції в копійках: кількість (соті) × ціна (копійки) / 100, округлення до копійки. */
export function calcLineAmount(quantityHundredths: number, unitPrice: number): number {
  return Math.round((quantityHundredths * unitPrice) / 100);
}

export function calcTotal(items: readonly CalcItem[]): number {
  return items.reduce((sum, item) => sum + calcLineAmount(item.quantityHundredths, item.unitPrice), 0);
}
