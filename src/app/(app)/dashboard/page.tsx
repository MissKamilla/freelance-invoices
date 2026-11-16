import type { Metadata } from 'next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddOutlined from '@mui/icons-material/AddOutlined';
import Link from '@/components/Link';
import { RevenueChart } from '@/features/dashboard/components/RevenueChart';
import { getDashboard } from '@/features/dashboard/queries';
import { InvoiceStatusChip } from '@/features/invoices/components/InvoiceStatusChip';
import { formatDate, todayKyiv } from '@/lib/dates';
import { getDisplayStatus } from '@/lib/invoice-status';
import { formatMoney } from '@/lib/money';
import { pluralUk } from '@/lib/amount-in-words';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Дашборд' };

const invoicesWord = (n: number) => `${n} ${pluralUk(n, ['рахунок', 'рахунки', 'рахунків'])}`;

function Kpi({ title, value, hint, tone }: { title: string; value: string; hint: string; tone?: 'error' }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography
          variant="h5"
          component="p"
          color={tone === 'error' ? 'error' : 'text.primary'}
          sx={{ my: 0.5, fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayKyiv();
  const data = await getDashboard(user.id, today);

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Дашборд
        </Typography>
        <Button component={Link} href="/invoices/new" variant="contained" startIcon={<AddOutlined />}>
          Новий рахунок
        </Button>
      </Stack>

      {!data.hasProfile && (
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/settings" color="inherit" size="small">
              Заповнити
            </Button>
          }
        >
          Вітаємо, {user.name}! Почніть із реквізитів ФОП — вони потраплять у кожен рахунок.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
        <Kpi title="Очікується" value={formatMoney(data.outstanding.total)} hint={invoicesWord(data.outstanding.count)} />
        <Kpi
          title="Прострочено"
          value={formatMoney(data.overdue.total)}
          hint={invoicesWord(data.overdue.count)}
          tone={data.overdue.count > 0 ? 'error' : undefined}
        />
        <Kpi
          title="Отримано цього місяця"
          value={formatMoney(data.paidThisMonth.total)}
          hint={invoicesWord(data.paidThisMonth.count)}
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' } }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Надходження за 6 місяців</Typography>
            <RevenueChart data={data.chart} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Останні рахунки</Typography>
              <Button component={Link} href="/invoices" size="small">
                Усі
              </Button>
            </Stack>
            {data.recent.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Тут з’являться виставлені рахунки.
              </Typography>
            ) : (
              <Stack>
                {data.recent.map((invoice) => (
                  <Stack
                    key={invoice.id}
                    component={Link}
                    href={`/invoices/${invoice.id}`}
                    direction="row"
                    spacing={1.5}
                    sx={{
                      py: 1.25,
                      alignItems: 'center',
                      color: 'inherit',
                      textDecoration: 'none',
                      '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
                    }}
                  >
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        № {invoice.number} · {invoice.client.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatMoney(invoice.total)} · до {formatDate(invoice.dueDate)}
                      </Typography>
                    </Box>
                    <InvoiceStatusChip status={getDisplayStatus(invoice, today)} />
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
