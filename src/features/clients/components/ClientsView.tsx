'use client';
import { useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import UnarchiveOutlined from '@mui/icons-material/UnarchiveOutlined';
import Link from '@/components/Link';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { setClientArchivedAction } from '../actions';
import type { ClientFormInput } from '../schema';
import { ClientDialog } from './ClientDialog';

export type ClientRow = ClientFormInput & { id: string; invoiceCount: number };

const toFormValues = ({ name, taxId, email, address, notes }: ClientRow): ClientFormInput => ({
  name,
  taxId,
  email,
  address,
  notes,
});

type DialogState = { open: false } | { open: true; client?: { id: string; values: ClientFormInput } };

export function ClientsView({ clients, archived }: { clients: ClientRow[]; archived: boolean }) {
  const notify = useNotify();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggleArchived = (row: ClientRow) => {
    setPendingId(row.id);
    startTransition(async () => {
      const result = await setClientArchivedAction(row.id, !archived);
      notify(
        result.ok ? (archived ? 'Клієнта відновлено' : 'Клієнта архівовано') : result.error,
        result.ok ? 'success' : 'error',
      );
      setPendingId(null);
    });
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Клієнти
        </Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setDialog({ open: true })}>
          Новий клієнт
        </Button>
      </Stack>

      <Tabs value={archived ? 'archived' : 'active'}>
        <Tab value="active" label="Активні" component={Link} href="/clients" />
        <Tab value="archived" label="Архів" component={Link} href="/clients?archived=1" />
      </Tabs>

      {clients.length === 0 ? (
        <Card sx={{ py: 6, px: 2, textAlign: 'center' }}>
          <PeopleAltOutlined color="disabled" sx={{ fontSize: 48 }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            {archived ? 'Архів порожній' : 'Ще немає клієнтів'}
          </Typography>
          {!archived && (
            <>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Додайте першого клієнта, щоб виставити йому рахунок.
              </Typography>
              <Button variant="outlined" startIcon={<AddOutlined />} onClick={() => setDialog({ open: true })}>
                Додати клієнта
              </Button>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Назва</TableCell>
                  <TableCell>ЄДРПОУ / РНОКПП</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Рахунків</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.name}
                      </Typography>
                      {row.address && (
                        <Typography variant="caption" color="text.secondary">
                          {row.address}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{row.taxId || '—'}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell align="right">{row.invoiceCount}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Редагувати">
                          <IconButton
                            aria-label={`Редагувати ${row.name}`}
                            onClick={() => setDialog({ open: true, client: { id: row.id, values: toFormValues(row) } })}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={archived ? 'Відновити' : 'Архівувати'}>
                          <IconButton
                            aria-label={`${archived ? 'Відновити' : 'Архівувати'} ${row.name}`}
                            onClick={() => toggleArchived(row)}
                            disabled={pendingId === row.id}
                          >
                            {archived ? <UnarchiveOutlined fontSize="small" /> : <ArchiveOutlined fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <ClientDialog
        open={dialog.open}
        client={dialog.open ? dialog.client : undefined}
        onClose={() => setDialog({ open: false })}
      />
    </Stack>
  );
}
