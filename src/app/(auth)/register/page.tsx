import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import Link from '@/components/Link';
import { SignUpForm } from '@/features/auth/components/AuthForms';

export const metadata: Metadata = { title: 'Реєстрація' };

export default function RegisterPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h1">
          Реєстрація
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Вже є акаунт?{' '}
          <MuiLink component={Link} href="/login">
            Увійти
          </MuiLink>
        </Typography>
      </Stack>
      <SignUpForm />
    </Stack>
  );
}
