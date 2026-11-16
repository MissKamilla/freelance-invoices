'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { applyServerErrors, muiField } from '@/lib/form';
import { saveClientAction, type SavedClient } from '../actions';
import { clientSchema, emptyClient, type ClientFormInput } from '../schema';

type ClientDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Якщо передано id — редагування, інакше створення. */
  client?: { id: string; values: ClientFormInput };
  onSaved?: (client: SavedClient) => void;
};

export function ClientDialog({ open, onClose, client, onSaved }: ClientDialogProps) {
  const notify = useNotify();
  const form = useForm({ resolver: zodResolver(clientSchema), defaultValues: emptyClient, mode: 'onTouched' });
  const field = (name: keyof ClientFormInput) => muiField(form, name);

  useEffect(() => {
    if (open) form.reset(client?.values ?? emptyClient);
  }, [open, client, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await saveClientAction(values, client?.id);
    if (result.ok) {
      notify(client ? 'Клієнта оновлено' : 'Клієнта додано');
      onSaved?.(result.data);
      onClose();
    } else {
      applyServerErrors(form, result);
      notify(result.error, 'error');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>{client ? 'Редагувати клієнта' : 'Новий клієнт'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Назва" placeholder="ТОВ «Альфа» або ФОП Петренко П.П." autoFocus {...field('name')} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="ЄДРПОУ / РНОКПП"
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
                {...field('taxId')}
              />
              <TextField label="Email" type="email" {...field('email')} />
            </Stack>
            <TextField label="Адреса" {...field('address')} />
            <TextField label="Нотатки" multiline minRows={2} {...field('notes')} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Скасувати</Button>
          <Button type="submit" variant="contained" loading={form.formState.isSubmitting}>
            Зберегти
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
