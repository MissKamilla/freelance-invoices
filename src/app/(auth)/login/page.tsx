import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import Link from '@/components/Link';
import { SignInForm } from '@/features/auth/components/AuthForms';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'Вхід' };

export default function LoginPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h1">
          Вхід
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Немає акаунта?{' '}
          <MuiLink component={Link} href="/register">
            Зареєструватися
          </MuiLink>
        </Typography>
      </Stack>
      <SignInForm demoEnabled={env.DEMO_MODE} />
    </Stack>
  );
}
