import { toIsoDate } from '@/lib/dates';
import { formatQuantity, toMoneyInput } from '@/lib/money';
import type { InvoiceWithRelations } from './queries';
import type { InvoiceDraftInput } from './schema';

/** Збережена чернетка → значення форми редактора. */
export function toDraftFormValues(invoice: InvoiceWithRelations): InvoiceDraftInput {
  return {
    clientId: invoice.clientId,
    dueDate: toIsoDate(invoice.dueDate),
    contractRef: invoice.contractRef ?? '',
    notes: invoice.notes ?? '',
    items: invoice.items.map((item) => ({
      description: item.description,
      unit: item.unit,
      quantity: formatQuantity(item.quantityHundredths),
      unitPrice: toMoneyInput(item.unitPrice),
    })),
  };
}
