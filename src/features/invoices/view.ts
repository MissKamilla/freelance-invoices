import { amountInWordsUk } from '@/lib/amount-in-words';
import { formatQuantity } from '@/lib/money';
import { clientSnapshotSchema, sellerSnapshotSchema, type ClientSnapshot, type SellerSnapshot } from './snapshot';

type IssuedInvoiceSource = {
  number: number | null;
  issueDate: Date | null;
  dueDate: Date;
  contractRef: string | null;
  notes: string | null;
  paymentPurpose: string | null;
  total: number;
  sellerSnapshot: unknown;
  clientSnapshot: unknown;
  items: {
    position: number;
    description: string;
    unit: string;
    quantityHundredths: number;
    unitPrice: number;
    amount: number;
  }[];
};

/** Дані документа «Рахунок на оплату» — для HTML-прев'ю, публічної сторінки й PDF. */
export type InvoiceView = {
  number: number;
  issueDate: Date;
  dueDate: Date;
  seller: SellerSnapshot;
  client: ClientSnapshot;
  contractRef: string | null;
  notes: string | null;
  paymentPurpose: string;
  items: { position: number; description: string; unit: string; quantity: string; unitPrice: number; amount: number }[];
  total: number;
  totalInWords: string;
};

/** Лише для виставлених рахунків: усі реквізити беремо зі знімків, а не з поточного профілю. */
export function toInvoiceView(invoice: IssuedInvoiceSource): InvoiceView {
  if (invoice.number === null || !invoice.issueDate || !invoice.paymentPurpose) {
    throw new Error('toInvoiceView: invoice is not issued');
  }
  return {
    number: invoice.number,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    seller: sellerSnapshotSchema.parse(invoice.sellerSnapshot),
    client: clientSnapshotSchema.parse(invoice.clientSnapshot),
    contractRef: invoice.contractRef,
    notes: invoice.notes,
    paymentPurpose: invoice.paymentPurpose,
    items: invoice.items.map((item) => ({
      position: item.position,
      description: item.description,
      unit: item.unit,
      quantity: formatQuantity(item.quantityHundredths),
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    total: invoice.total,
    totalInWords: amountInWordsUk(invoice.total),
  };
}
