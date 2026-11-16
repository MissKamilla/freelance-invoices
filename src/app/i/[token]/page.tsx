import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { InvoiceDocument } from '@/features/invoices/components/InvoiceDocument';
import { toInvoiceView } from '@/features/invoices/view';
import { MarkViewed } from '@/features/public/components/MarkViewed';
import { PaymentPanel } from '@/features/public/components/PaymentPanel';
import { getPublicInvoice } from '@/features/public/queries';
import { todayKyiv } from '@/lib/dates';

export async function generateMetadata({ params }: PageProps<'/i/[token]'>): Promise<Metadata> {
  const invoice = await getPublicInvoice((await params).token);
  return {
    title: invoice ? `Рахунок № ${invoice.number}` : 'Рахунок',
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvoicePage({ params }: PageProps<'/i/[token]'>) {
  const { token } = await params;
  const invoice = await getPublicInvoice(token);
  if (!invoice) notFound();

  const view = toInvoiceView(invoice);
  const overdue = invoice.status === 'SENT' && invoice.dueDate.getTime() < todayKyiv().getTime();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      <MarkViewed token={token} />
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 380px' },
        }}
      >
        <Box sx={{ order: { xs: 2, md: 1 }, minWidth: 0 }}>
          <InvoiceDocument view={view} />
        </Box>
        <Box sx={{ order: { xs: 1, md: 2 }, position: { md: 'sticky' }, top: { md: 24 } }}>
          <PaymentPanel token={token} view={view} paidAt={invoice.paidAt} overdue={overdue} />
        </Box>
      </Box>
    </Container>
  );
}
