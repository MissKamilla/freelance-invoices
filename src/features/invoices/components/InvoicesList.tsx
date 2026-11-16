'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Link from '@/components/Link';
import { formatDate } from '@/lib/dates';
import type { DisplayStatus } from '@/lib/invoice-status';
import { formatMoney } from '@/lib/money';
import type { InvoiceFilter } from '../queries';
import { InvoiceStatusChip } from './InvoiceStatusChip';

export type InvoiceRow = {
  id: string;
  number: number | null;
  clientName: string;
  issueDate: Date | null;
  dueDate: Date;
  total: number;
  status: DisplayStatus;
};

const TABS: { value: InvoiceFilter; label: string }[] = [
  { value: 'all', label: 'Усі' },
  { value: 'unpaid', label: 'Очікують оплати' },
  { value: 'overdue', label: 'Прострочені' },
  { value: 'paid', label: 'Оплачені' },
  { value: 'draft', label: 'Чернетки' },
  { value: 'cancelled', label: 'Скасовані' },
];

type InvoicesListProps = {
  rows: InvoiceRow[];
  filter: InvoiceFilter;
  q: string;
  counts: Record<InvoiceFilter, number>;
};

export function InvoicesList({ rows, filter, q, counts }: InvoicesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);

  const hrefFor = (nextFilter: InvoiceFilter, nextQ: string) => {
    const params = new URLSearchParams();
    if (nextFilter !== 'all') params.set('status', nextFilter);
    if (nextQ.trim()) params.set('q', nextQ.trim());
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  // Пошук оновлює URL із затримкою — сторінка перерендериться на сервері з новим фільтром.
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => router.replace(hrefFor(filter, search)), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Рахунки
        </Typography>
        <Button component={Link} href="/invoices/new" variant="contained" startIcon={<AddOutlined />}>
          Новий рахунок
        </Button>
      </Stack>

      <Tabs value={filter} variant="scrollable" allowScrollButtonsMobile>
        {TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={`${tab.label} · ${counts[tab.value]}`}
            component={Link}
            href={hrefFor(tab.value, search)}
          />
        ))}
      </Tabs>

      <TextField
        size="small"
        placeholder="Пошук за номером або клієнтом"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: 400 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: { 'aria-label': 'Пошук рахунків' },
        }}
      />

      {rows.length === 0 ? (
        <Card sx={{ py: 6, px: 2, textAlign: 'center' }}>
          <ReceiptLongOutlined color="disabled" sx={{ fontSize: 48 }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            {counts.all === 0 ? 'Ще немає рахунків' : 'Нічого не знайдено'}
          </Typography>
          {counts.all === 0 && (
            <>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Створіть перший рахунок — це займе хвилину.
              </Typography>
              <Button component={Link} href="/invoices/new" variant="outlined" startIcon={<AddOutlined />}>
                Створити рахунок
              </Button>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>№</TableCell>
                  <TableCell>Клієнт</TableCell>
                  <TableCell>Дата</TableCell>
                  <TableCell>Оплатити до</TableCell>
                  <TableCell align="right">Сума</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => router.push(`/invoices/${row.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <MuiLink
                        component={Link}
                        href={`/invoices/${row.id}`}
                        underline="hover"
                        onClick={(e) => e.stopPropagation()}
                        sx={{ fontWeight: 600 }}
                      >
                        {row.number ?? 'Чернетка'}
                      </MuiLink>
                    </TableCell>
                    <TableCell>{row.clientName}</TableCell>
                    <TableCell>{row.issueDate ? formatDate(row.issueDate) : '—'}</TableCell>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatMoney(row.total)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusChip status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Stack>
  );
}
