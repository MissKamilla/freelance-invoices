import type { Metadata } from 'next';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { getProfile } from '@/features/profile/queries';
import { DEFAULT_TAX_NOTE, type ProfileFormInput } from '@/features/profile/schema';
import { formatIban } from '@/lib/iban';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Налаштування' };

export default async function SettingsPage({ searchParams }: PageProps<'/settings'>) {
  const user = await requireUser();
  const [profile, { welcome }] = await Promise.all([getProfile(user.id), searchParams]);

  const defaultValues: ProfileFormInput = profile
    ? {
        legalName: profile.legalName,
        taxId: profile.taxId,
        iban: formatIban(profile.iban),
        bankName: profile.bankName,
        address: profile.address,
        phone: profile.phone ?? '',
        taxNote: profile.taxNote,
        defaultDueDays: profile.defaultDueDays,
      }
    : {
        legalName: `ФОП ${user.name}`,
        taxId: '',
        iban: '',
        bankName: '',
        address: '',
        phone: '',
        taxNote: DEFAULT_TAX_NOTE,
        defaultDueDays: 7,
      };

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography variant="h4" component="h1">
        Налаштування
      </Typography>
      {!profile && (
        <Alert severity={welcome ? 'info' : 'warning'}>
          {welcome ? 'Вітаємо! ' : ''}Заповніть реквізити ФОП — без них не можна виставити рахунок.
        </Alert>
      )}
      <ProfileForm defaultValues={defaultValues} />
    </Stack>
  );
}
