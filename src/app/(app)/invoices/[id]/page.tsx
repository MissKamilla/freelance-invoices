import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Typography from '@mui/material/Typography';
import { InvoiceEditor } from '@/features/invoices/components/InvoiceEditor';
import { toDraftFormValues } from '@/features/invoices/mappers';
import { getInvoice, listClientOptions } from '@/features/invoices/queries';
import { getProfile } from '@/features/profile/queries';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Рахунок' };

export default async function InvoicePage({ params }: PageProps<'/invoices/[id]'>) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await getInvoice(user.id, id);
  if (!invoice) notFound();

  if (invoice.status === 'DRAFT') {
    const [clients, profile] = await Promise.all([
      listClientOptions(user.id, invoice.clientId),
      getProfile(user.id),
    ]);
    return (
      <InvoiceEditor
        key={invoice.updatedAt.toISOString()}
        invoiceId={invoice.id}
        clients={clients}
        defaultValues={toDraftFormValues(invoice)}
        hasProfile={Boolean(profile)}
      />
    );
  }

  return (
    <Typography variant="h4" component="h1">
      Рахунок № {invoice.number}
    </Typography>
  );
}
