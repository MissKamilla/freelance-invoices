import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@/components/Link';
import { sellerSnapshotSchema } from '@/features/invoices/snapshot';
import { MockCheckoutForm } from '@/features/payments/components/MockCheckoutForm';
import { getCheckoutPayment } from '@/features/payments/service';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Mock Pay — тестова оплата', robots: { index: false } };

export default async function MockCheckoutPage({ params }: PageProps<'/pay/mock/[paymentId]'>) {
  const { paymentId } = await params;
  const payment = await getCheckoutPayment(paymentId);
  if (!payment || payment.provider !== 'MOCK' || !payment.invoice.publicToken) notFound();

  const backUrl = `/i/${payment.invoice.publicToken}`;
  const seller = sellerSnapshotSchema.safeParse(payment.invoice.sellerSnapshot);
  const actionable =
    payment.status === 'PENDING' && payment.invoice.status === 'SENT' && (!payment.expiresAt || payment.expiresAt > new Date());

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: '#EEF1F6' }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Mock Pay</Typography>
              <Chip label="тестовий режим" color="warning" size="small" />
            </Stack>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Рахунок № {payment.invoice.number}
                {seller.success ? ` · ${seller.data.legalName}` : ''}
              </Typography>
              <Typography variant="h4" component="p">
                {formatMoney(payment.amount)}
              </Typography>
            </Box>
            {actionable ? (
              <MockCheckoutForm paymentId={payment.id} amount={payment.amount} backUrl={backUrl} />
            ) : (
              <Stack spacing={2}>
                <Alert severity="info">Платіж неактуальний: його вже завершено, скасовано або минув час на оплату.</Alert>
                <Button component={Link} href={backUrl} variant="contained">
                  Повернутися до рахунку
                </Button>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
