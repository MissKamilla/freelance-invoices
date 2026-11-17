import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { InvoiceEventType, PaymentProvider, PaymentStatus } from '@/generated/prisma/enums';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

const EVENT_LABELS: Record<InvoiceEventType, string> = {
  CREATED: 'Створено чернетку',
  ISSUED: 'Рахунок виставлено',
  EMAIL_SENT: 'Лист клієнту надіслано',
  VIEWED: 'Клієнт переглянув рахунок',
  PAYMENT_STARTED: 'Клієнт почав оплату',
  PAYMENT_FAILED: 'Оплата не пройшла',
  PAID: 'Рахунок оплачено',
  AMOUNT_MISMATCH: 'Сума оплати не збігається з рахунком',
  NEEDS_REFUND: 'Повторна оплата — потрібне повернення',
  REFUNDED: 'Кошти повернено',
  REMINDER_SENT: 'Надіслано нагадування',
  CANCELLED: 'Рахунок скасовано',
};

const WARNING_EVENTS = new Set<InvoiceEventType>(['PAYMENT_FAILED', 'AMOUNT_MISMATCH', 'NEEDS_REFUND']);

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  MOCK: 'Картка (тестова оплата)',
  MONOBANK: 'Картка (monobank)',
  MANUAL: 'Переказ (позначено вручну)',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'очікує',
  SUCCEEDED: 'успішно',
  FAILED: 'відхилено',
  EXPIRED: 'не завершено',
  REFUNDED: 'повернено',
};

type TimelineProps = {
  events: { id: string; type: InvoiceEventType; createdAt: Date }[];
  payments: { id: string; provider: PaymentProvider; status: PaymentStatus; amount: number; createdAt: Date }[];
};

export function InvoiceTimeline({ events, payments }: TimelineProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Історія
        </Typography>
        <Stack spacing={1.5}>
          {events.map((event) => (
            <Stack key={event.id} direction="row" spacing={1.5}>
              <Box
                sx={{
                  mt: 0.75,
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: WARNING_EVENTS.has(event.type) ? 'error.main' : 'primary.main',
                }}
              />
              <Box>
                <Typography variant="body2">{EVENT_LABELS[event.type]}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(event.createdAt)}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
          Платежі
        </Typography>
        {payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Ще немає
          </Typography>
        ) : (
          <Stack spacing={1}>
            {payments.map((payment) => (
              <Box key={payment.id}>
                <Typography variant="body2">
                  {PROVIDER_LABELS[payment.provider]} — {formatMoney(payment.amount)},{' '}
                  {PAYMENT_STATUS_LABELS[payment.status]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(payment.createdAt)}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
