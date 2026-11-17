import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { formatDate, formatDateLong } from '@/lib/dates';
import { formatIban } from '@/lib/iban';
import { formatAmount } from '@/lib/money';
import type { InvoiceView } from '../view';

function Party({ title, lines }: { title: string; lines: React.ReactNode[] }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      {lines.filter(Boolean).map((line, i) => (
        <Typography key={i} variant="body2" sx={i === 0 ? { fontWeight: 600 } : undefined}>
          {line}
        </Typography>
      ))}
    </Box>
  );
}

/** Документ «Рахунок на оплату» — один компонент для кабінету й публічної сторінки. */
export function InvoiceDocument({ view }: { view: InvoiceView }) {
  const { seller, client } = view;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Рахунок на оплату № {view.number}
          </Typography>
          <Typography color="text.secondary">від {formatDateLong(view.issueDate)}</Typography>
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Party
            title="Постачальник"
            lines={[
              seller.legalName,
              `РНОКПП ${seller.taxId}`,
              seller.address,
              <>
                IBAN{' '}
                <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                  {formatIban(seller.iban)}
                </Box>
              </>,
              seller.bankName,
              seller.taxNote,
            ]}
          />
          <Party
            title="Платник"
            lines={[client.name, client.taxId && `Код ${client.taxId}`, client.address, client.email]}
          />
        </Box>

        {view.contractRef && (
          <Typography variant="body2">
            <b>Підстава:</b> {view.contractRef}
          </Typography>
        )}

        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 520,
              '& th': { whiteSpace: 'nowrap' },
              '& td:not(:nth-of-type(2))': { whiteSpace: 'nowrap' },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>№</TableCell>
                <TableCell>Найменування</TableCell>
                <TableCell>Од.</TableCell>
                <TableCell align="right">К-сть</TableCell>
                <TableCell align="right">Ціна, грн</TableCell>
                <TableCell align="right">Сума, грн</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {view.items.map((item) => (
                <TableRow key={item.position}>
                  <TableCell>{item.position}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatAmount(item.unitPrice)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatAmount(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack spacing={0.5} sx={{ alignItems: 'flex-end', textAlign: 'right' }}>
          <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            Разом до сплати: {formatAmount(view.total)} грн
          </Typography>
          <Typography variant="body2">{view.totalInWords}. Без ПДВ</Typography>
        </Stack>

        <Divider />

        <Stack spacing={0.5}>
          <Typography variant="body2">
            <b>Рахунок дійсний до:</b> {formatDate(view.dueDate)}
          </Typography>
          <Typography variant="body2">
            <b>Призначення платежу:</b> {view.paymentPurpose}
          </Typography>
          {view.notes && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', pt: 1 }}>
              {view.notes}
            </Typography>
          )}
        </Stack>

        <Typography variant="body2" sx={{ pt: 2 }}>
          Постачальник ____________________ {seller.legalName}
        </Typography>
      </Stack>
    </Paper>
  );
}
