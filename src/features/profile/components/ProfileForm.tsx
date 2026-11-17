'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { applyServerErrors, muiField } from '@/lib/form';
import { bankNameFromIban } from '@/lib/iban';
import { saveProfileAction } from '../actions';
import { profileSchema, type ProfileFormInput } from '../schema';

export function ProfileForm({ defaultValues }: { defaultValues: ProfileFormInput }) {
  const notify = useNotify();
  const form = useForm({ resolver: zodResolver(profileSchema), defaultValues, mode: 'onTouched' });
  const field = (name: keyof ProfileFormInput) => muiField(form, name);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await saveProfileAction(values);
    if (result.ok) {
      notify('Реквізити збережено');
      form.reset(values);
    } else {
      applyServerErrors(form, result);
      notify(result.error, 'error');
    }
  });

  // Підказуємо назву банку за МФО з IBAN, якщо поле ще порожнє.
  const ibanField = field('iban');
  const onIbanBlur: typeof ibanField.onBlur = async (event) => {
    await ibanField.onBlur(event);
    const suggestion = bankNameFromIban(event.target.value);
    if (suggestion && !form.getValues('bankName')) {
      form.setValue('bankName', suggestion, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Реквізити ФОП
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ці дані з’являться в кожному рахунку. Вже виставлені рахунки не зміняться.
            </Typography>
            <Stack spacing={2}>
              <TextField label="ПІБ / назва" placeholder="ФОП Іваненко Олена Петрівна" {...field('legalName')} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="РНОКПП"
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
                  {...field('taxId')}
                />
                <TextField label="Телефон" placeholder="+380 67 123 45 67" {...field('phone')} />
              </Stack>
              <TextField
                label="IBAN"
                placeholder="UA57 3220 0100 0002 6007 2335 6600 1"
                {...ibanField}
                onBlur={onIbanBlur}
              />
              <TextField label="Банк" {...field('bankName')} />
              <TextField label="Адреса" placeholder="м. Київ, вул. Хрещатик, 1" {...field('address')} />
              <TextField label="Податковий статус" {...field('taxNote')} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Налаштування рахунків
            </Typography>
            <TextField
              label="Термін оплати за замовчуванням"
              type="number"
              sx={{ maxWidth: 320 }}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">днів</InputAdornment> },
                htmlInput: { min: 1, max: 90 },
              }}
              {...muiField(form, 'defaultDueDays', { valueAsNumber: true })}
            />
          </CardContent>
        </Card>

        <Box>
          <Button type="submit" variant="contained" size="large" loading={form.formState.isSubmitting}>
            Зберегти
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
