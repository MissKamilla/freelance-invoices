'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import Link from '@/components/Link';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { ClientDialog } from '@/features/clients/components/ClientDialog';
import { amountInWordsUk } from '@/lib/amount-in-words';
import { applyServerErrors, muiField } from '@/lib/form';
import { calcLineAmount } from '@/lib/invoice-calc';
import { formatAmount, formatMoney, parseMoney, parseQuantity } from '@/lib/money';
import { deleteDraftAction, issueInvoiceAction, saveInvoiceDraftAction } from '../actions';
import { emptyItem, invoiceDraftSchema, UNITS, type InvoiceDraftInput, type InvoiceItemInput } from '../schema';

type ClientOption = { id: string; name: string };

type InvoiceEditorProps = {
  invoiceId?: string;
  clients: ClientOption[];
  defaultValues: InvoiceDraftInput;
  hasProfile: boolean;
};

function lineAmount(item: Partial<InvoiceItemInput> | undefined): number {
  const quantity = parseQuantity(item?.quantity ?? '') ?? 0;
  const price = parseMoney(item?.unitPrice ?? '') ?? 0;
  return calcLineAmount(quantity, price);
}

export function InvoiceEditor({ invoiceId, clients: initialClients, defaultValues, hasProfile }: InvoiceEditorProps) {
  const router = useRouter();
  const notify = useNotify();
  const [clients, setClients] = useState(initialClients);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm({ resolver: zodResolver(invoiceDraftSchema), defaultValues, mode: 'onTouched' });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const items = useWatch({ control: form.control, name: 'items' });
  const total = (items ?? []).reduce((sum, item) => sum + lineAmount(item), 0);
  const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message;

  const [intent, setIntent] = useState<'save' | 'issue'>('save');

  // На сервер відправляємо «сирі» значення форми: схема там розбере їх ще раз.
  const submit = (mode: 'save' | 'issue') =>
    form.handleSubmit(async () => {
      setIntent(mode);
      const values = form.getValues();
      const saved = await saveInvoiceDraftAction(values, invoiceId);
      if (!saved.ok) {
        applyServerErrors(form, saved);
        notify(saved.error, 'error');
        return;
      }
      form.reset(values);
      const id = saved.data.id;

      if (mode === 'issue') {
        const issued = await issueInvoiceAction(id);
        notify(issued.ok ? `Рахунок № ${issued.data.number} виставлено` : issued.error, issued.ok ? 'success' : 'error');
      } else {
        notify('Чернетку збережено');
      }

      if (invoiceId) router.refresh();
      else router.push(`/invoices/${id}`);
    });

  const onDelete = async () => {
    if (!invoiceId) return;
    setDeleting(true);
    const result = await deleteDraftAction(invoiceId);
    // Успіх — redirect на сервері; сюди потрапляємо лише з помилкою.
    if (!result.ok) notify(result.error, 'error');
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <Box component="form" onSubmit={submit('save')} noValidate>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Typography variant="h4" component="h1">
            {invoiceId ? 'Чернетка рахунку' : 'Новий рахунок'}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {invoiceId && (
              <Button color="error" startIcon={<DeleteOutlined />} onClick={() => setConfirmDelete(true)}>
                Видалити
              </Button>
            )}
            <Button
              type="submit"
              variant="outlined"
              loading={form.formState.isSubmitting && intent === 'save'}
              disabled={form.formState.isSubmitting}
            >
              Зберегти чернетку
            </Button>
            <Tooltip title={hasProfile ? '' : 'Спершу заповніть реквізити ФОП'}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<SendOutlined />}
                  onClick={submit('issue')}
                  loading={form.formState.isSubmitting && intent === 'issue'}
                  disabled={!hasProfile || form.formState.isSubmitting}
                >
                  Виставити
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {!hasProfile && (
          <Alert
            severity="warning"
            action={
              <Button component={Link} href="/settings" color="inherit" size="small">
                Заповнити
              </Button>
            }
          >
            Чернетку можна зберегти, але щоб виставити рахунок, заповніть реквізити ФОП.
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
                alignItems: 'start',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Controller
                  control={form.control}
                  name="clientId"
                  render={({ field, fieldState }) => (
                    <Autocomplete
                      fullWidth
                      options={clients}
                      getOptionLabel={(option) => option.name}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      value={clients.find((c) => c.id === field.value) ?? null}
                      onChange={(_, option) => field.onChange(option?.id ?? '')}
                      onBlur={field.onBlur}
                      noOptionsText="Немає клієнтів — додайте нового"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Клієнт"
                          error={Boolean(fieldState.error)}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    />
                  )}
                />
                <Tooltip title="Новий клієнт">
                  <IconButton aria-label="Додати нового клієнта" onClick={() => setClientDialogOpen(true)} sx={{ mt: 1 }}>
                    <PersonAddOutlined />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Controller
                control={form.control}
                name="dueDate"
                render={({ field, fieldState }) => (
                  <DatePicker
                    label="Оплатити до"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(value) => field.onChange(value?.isValid() ? value.format('YYYY-MM-DD') : '')}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: Boolean(fieldState.error),
                        helperText: fieldState.error?.message,
                      },
                    }}
                  />
                )}
              />

              <TextField
                label="Підстава (необов’язково)"
                placeholder="Договір № 7 від 01.09.2026"
                sx={{ gridColumn: { md: '1 / -1' } }}
                {...muiField(form, 'contractRef')}
              />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Позиції
            </Typography>
            <Stack spacing={2} divider={<Divider flexItem sx={{ display: { md: 'none' } }} />}>
              {fields.map((row, index) => (
                <Box
                  key={row.id}
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    alignItems: 'start',
                    gridTemplateColumns: {
                      xs: '1fr 1fr',
                      md: 'minmax(0, 1fr) 130px 100px 140px 140px 40px',
                    },
                  }}
                >
                  <TextField
                    size="small"
                    label="Опис"
                    sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
                    {...muiField(form, `items.${index}.description`)}
                  />
                  <TextField
                    size="small"
                    select
                    label="Од."
                    slotProps={{ select: { native: true } }}
                    {...muiField(form, `items.${index}.unit`)}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label="К-сть"
                    slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                    {...muiField(form, `items.${index}.quantity`)}
                  />
                  <TextField
                    size="small"
                    label="Ціна, ₴"
                    slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                    {...muiField(form, `items.${index}.unitPrice`)}
                  />
                  <Box sx={{ alignSelf: 'center', textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>
                      Сума
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatAmount(lineAmount(items?.[index]))}
                    </Typography>
                  </Box>
                  <Tooltip title="Видалити позицію">
                    <span>
                      <IconButton
                        aria-label={`Видалити позицію ${index + 1}`}
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
            {itemsError && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {itemsError}
              </Typography>
            )}
            <Button startIcon={<AddOutlined />} onClick={() => append(emptyItem)} sx={{ mt: 2 }}>
              Додати позицію
            </Button>

            <Divider sx={{ my: 3 }} />
            <Stack sx={{ alignItems: 'flex-end', textAlign: 'right' }} spacing={0.5}>
              <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                Разом до сплати: {formatMoney(total)}
              </Typography>
              {total > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {amountInWordsUk(total)}. Без ПДВ
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <TextField
              label="Примітка для клієнта"
              multiline
              minRows={2}
              placeholder="Дякую за співпрацю!"
              {...muiField(form, 'notes')}
            />
          </CardContent>
        </Card>
      </Stack>

      <ClientDialog
        open={clientDialogOpen}
        onClose={() => setClientDialogOpen(false)}
        onSaved={(client) => {
          setClients((list) => [...list, client].sort((a, b) => a.name.localeCompare(b.name, 'uk')));
          form.setValue('clientId', client.id, { shouldValidate: true, shouldDirty: true });
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Видалити чернетку?"
        text="Чернетку буде видалено без можливості відновлення."
        confirmLabel="Видалити"
        danger
        pending={deleting}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Box>
  );
}
