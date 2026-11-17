'use client';
import { useState, useTransition } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ContentPasteGoOutlined from '@mui/icons-material/ContentPasteGoOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import type { InvoiceStatus } from '@/generated/prisma/enums';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { useCopy } from '@/components/feedback/useCopy';
import type { ActionResult } from '@/lib/action-result';
import { cancelInvoiceAction, duplicateInvoiceAction, markInvoicePaidAction, remindInvoiceAction } from '../actions';

type Confirm = 'paid' | 'cancel' | null;

type InvoiceActionsProps = {
  invoiceId: string;
  number: number;
  status: InvoiceStatus;
  publicUrl: string | null;
};

export function InvoiceActions({ invoiceId, number, status, publicUrl }: InvoiceActionsProps) {
  const notify = useNotify();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>, successMessage: string) =>
    startTransition(async () => {
      const result = await action();
      notify(result.ok ? successMessage : result.error, result.ok ? 'success' : 'error');
      setConfirm(null);
    });

  const copy = useCopy();
  const copyLink = () => publicUrl && copy(publicUrl, 'Посилання для клієнта скопійовано');

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {publicUrl && status !== 'CANCELLED' && (
        <Button variant="contained" startIcon={<ContentCopyOutlined />} onClick={copyLink}>
          Копіювати посилання
        </Button>
      )}
      {publicUrl && status !== 'CANCELLED' && (
        <Button variant="outlined" startIcon={<FileDownloadOutlined />} href={`${publicUrl}/pdf`}>
          PDF
        </Button>
      )}
      {status === 'SENT' && (
        <Button
          variant="outlined"
          startIcon={<NotificationsActiveOutlined />}
          disabled={pending}
          onClick={() => run(() => remindInvoiceAction(invoiceId), 'Нагадування надіслано клієнту')}
        >
          Нагадати
        </Button>
      )}
      {status === 'SENT' && (
        <Button variant="outlined" startIcon={<CheckCircleOutlined />} onClick={() => setConfirm('paid')}>
          Позначити оплаченим
        </Button>
      )}
      <Button
        variant="outlined"
        startIcon={<ContentPasteGoOutlined />}
        disabled={pending}
        onClick={() => run(() => duplicateInvoiceAction(invoiceId), 'Створено копію')}
      >
        Дублювати
      </Button>
      {status === 'SENT' && (
        <Button color="error" startIcon={<BlockOutlined />} onClick={() => setConfirm('cancel')}>
          Скасувати
        </Button>
      )}

      <ConfirmDialog
        open={confirm === 'paid'}
        title={`Позначити рахунок № ${number} оплаченим?`}
        text="Використовуйте, якщо клієнт заплатив переказом на IBAN і гроші вже надійшли на рахунок."
        confirmLabel="Позначити оплаченим"
        pending={pending}
        onConfirm={() => run(() => markInvoicePaidAction(invoiceId), 'Рахунок позначено оплаченим')}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        title={`Скасувати рахунок № ${number}?`}
        text="Посилання для оплати перестане працювати. Номер рахунку залишиться за ним."
        confirmLabel="Скасувати рахунок"
        danger
        pending={pending}
        onConfirm={() => run(() => cancelInvoiceAction(invoiceId), 'Рахунок скасовано')}
        onClose={() => setConfirm(null)}
      />
    </Stack>
  );
}
