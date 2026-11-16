import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Link from '@/components/Link';
import { InvoiceActions } from '@/features/invoices/components/InvoiceActions';
import { InvoiceDocument } from '@/features/invoices/components/InvoiceDocument';
import { InvoiceEditor } from '@/features/invoices/components/InvoiceEditor';
import { InvoiceStatusChip } from '@/features/invoices/components/InvoiceStatusChip';
import { InvoiceTimeline } from '@/features/invoices/components/InvoiceTimeline';
import { toDraftFormValues } from '@/features/invoices/mappers';
import { getInvoice, listClientOptions } from '@/features/invoices/queries';
import { toInvoiceView } from '@/features/invoices/view';
import { getProfile } from '@/features/profile/queries';
import { todayKyiv } from '@/lib/dates';
import { env } from '@/lib/env';
import { getDisplayStatus } from '@/lib/invoice-status';
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

  const view = toInvoiceView(invoice);
  const publicUrl = invoice.publicToken ? `${env.APP_URL}/i/${invoice.publicToken}` : null;
  const mismatches = invoice.events.filter((e) => e.type === 'AMOUNT_MISMATCH').length;
  const refunds = invoice.events.filter((e) => e.type === 'NEEDS_REFUND').length;

  return (
    <Stack spacing={3}>
      <Box>
        <Button component={Link} href="/invoices" startIcon={<ArrowBackOutlined />} sx={{ mb: 1 }}>
          Рахунки
        </Button>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h4" component="h1">
            Рахунок № {view.number}
          </Typography>
          <InvoiceStatusChip status={getDisplayStatus(invoice, todayKyiv())} size="medium" />
        </Stack>
        <Typography color="text.secondary">{view.client.name}</Typography>
      </Box>

      {mismatches > 0 && (
        <Alert severity="warning">
          Отримано оплату карткою, сума якої не збігається з рахунком. Перевірте надходження й зв’яжіться з клієнтом.
        </Alert>
      )}
      {refunds > 0 && (
        <Alert severity="error">
          Отримано зайву оплату карткою (рахунок уже оплачено або скасовано). Поверніть кошти клієнту.
        </Alert>
      )}

      <InvoiceActions invoiceId={invoice.id} number={view.number} status={invoice.status} publicUrl={publicUrl} />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
        }}
      >
        <InvoiceDocument view={view} />
        <InvoiceTimeline events={invoice.events} payments={invoice.payments} />
      </Box>
    </Stack>
  );
}
