import type { Metadata } from 'next';
import { InvoicesList, type InvoiceRow } from '@/features/invoices/components/InvoicesList';
import { countInvoicesByFilter, INVOICE_FILTERS, listInvoices, type InvoiceFilter } from '@/features/invoices/queries';
import { todayKyiv } from '@/lib/dates';
import { getDisplayStatus } from '@/lib/invoice-status';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Рахунки' };

function parseFilter(value: unknown): InvoiceFilter {
  return INVOICE_FILTERS.find((f) => f === value) ?? 'all';
}

export default async function InvoicesPage({ searchParams }: PageProps<'/invoices'>) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = parseFilter(params.status);
  const q = typeof params.q === 'string' ? params.q : '';
  const today = todayKyiv();

  const [invoices, counts] = await Promise.all([
    listInvoices(user.id, { filter, q, today }),
    countInvoicesByFilter(user.id, today),
  ]);

  const rows: InvoiceRow[] = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.client.name,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    total: invoice.total,
    status: getDisplayStatus(invoice, today),
  }));

  return <InvoicesList key={filter} rows={rows} filter={filter} q={q} counts={counts} />;
}
