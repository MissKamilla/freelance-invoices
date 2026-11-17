import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Дашборд' };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <Stack spacing={1}>
      <Typography variant="h4" component="h1">
        Дашборд
      </Typography>
      <Typography color="text.secondary">Вітаємо, {user.name}! Тут з’являться ваші рахунки й надходження.</Typography>
    </Stack>
  );
}
