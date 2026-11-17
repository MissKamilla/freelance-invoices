import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import { CopyField } from '@/components/CopyField';
import { NbuQrCode } from '@/components/NbuQrCode';
import type { InvoiceView } from '@/features/invoices/view';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatIban } from '@/lib/iban';
import { formatAmount, formatMoney } from '@/lib/money';
import { buildNbuQrUrl } from '@/lib/nbu-qr';

type PaymentPanelProps = {
  token: string;
  view: InvoiceView;
  paidAt: Date | null;
  overdue: boolean;
  /** Блок онлайн-оплати (кнопка/стан платежу) — передається зі сторінки. */
  cardPayment?: React.ReactNode;
};

export function PaymentPanel({ token, view, paidAt, overdue, cardPayment }: PaymentPanelProps) {
  const { seller } = view;
  const qrUrl = buildNbuQrUrl({
    recipient: seller.legalName,
    iban: seller.iban,
    recipientCode: seller.taxId,
    purpose: view.paymentPurpose,
    amount: view.total,
  });

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              До сплати
            </Typography>
            <Typography variant="h4" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(view.total)}
            </Typography>
            <Typography variant="body2" color={overdue && !paidAt ? 'error' : 'text.secondary'}>
              {overdue && !paidAt ? 'Термін оплати минув ' : 'Оплатити до '}
              {formatDate(view.dueDate)}
            </Typography>
          </Stack>

          {paidAt ? (
            <Alert severity="success" variant="filled">
              Оплачено {formatDateTime(paidAt)}. Дякуємо!
            </Alert>
          ) : (
            <>
              {cardPayment}
              <Divider>{cardPayment ? 'або переказом' : 'Оплата переказом'}</Divider>
              <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
                <NbuQrCode url={qrUrl} title={`QR-код для оплати рахунку № ${view.number}`} />
                <Typography variant="body2" color="text.secondary">
                  Відскануйте камерою телефона або в застосунку банку — реквізити й сума заповняться автоматично.
                </Typography>
              </Stack>
              <Stack spacing={1.5}>
                <CopyField label="Отримувач" value={seller.legalName} />
                <CopyField label="IBAN" value={formatIban(seller.iban)} copyValue={seller.iban} />
                <CopyField label="РНОКПП / код отримувача" value={seller.taxId} />
                <CopyField label="Сума" value={formatMoney(view.total)} copyValue={formatAmount(view.total).replace(/\s/g, '')} />
                <CopyField label="Призначення платежу" value={view.paymentPurpose} />
              </Stack>
            </>
          )}

          <Button
            href={`/i/${token}/pdf`}
            variant="outlined"
            startIcon={<FileDownloadOutlined />}
            fullWidth
          >
            Завантажити PDF
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
