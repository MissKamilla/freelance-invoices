import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { InvoiceDocument } from '@/features/invoices/components/InvoiceDocument';
import { toInvoiceView } from '@/features/invoices/view';
import { MarkViewed } from '@/features/public/components/MarkViewed';
import { PaymentPanel } from '@/features/public/components/PaymentPanel';
import { getPublicInvoice, getReturnedPayment } from '@/features/public/queries';
import { CardPayment } from '@/features/payments/components/CardPayment';
import { todayKyiv } from '@/lib/dates';

export async function generateMetadata({ params }: PageProps<'/i/[token]'>): Promise<Metadata> {
  const invoice = await getPublicInvoice((await params).token);
  return {
    title: invoice ? `Рахунок № ${invoice.number}` : 'Рахунок',
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvoicePage({ params, searchParams }: PageProps<'/i/[token]'>) {
  const [{ token }, { payment: paymentId }] = await Promise.all([params, searchParams]);
  const invoice = await getPublicInvoice(token);
  if (!invoice) notFound();

  const returnedPayment =
    typeof paymentId === 'string' ? await getReturnedPayment(invoice.id, paymentId) : null;
  const returned = returnedPayment && {
    status:
      returnedPayment.status === 'PENDING' || returnedPayment.status === 'FAILED'
        ? returnedPayment.status
        : returnedPayment.status === 'SUCCEEDED' && invoice.status !== 'PAID'
          ? ('MISMATCH' as const)
          : ('OTHER' as const),
    failureReason: returnedPayment.failureReason,
  };

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
          <PaymentPanel
            token={token}
            view={view}
            paidAt={invoice.paidAt}
            overdue={overdue}
            cardPayment={<CardPayment token={token} returned={returned ?? undefined} />}
          />
        </Box>
      </Box>
    </Container>
  );
}
