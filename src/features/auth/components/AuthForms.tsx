'use client';
import { useActionState, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import {
  demoSignInAction,
  signInAction,
  signUpAction,
  type AuthFormState,
} from '@/features/auth/actions';

function fieldError(state: AuthFormState, field: string): string | undefined {
  return state && !state.ok ? state.fieldErrors?.[field]?.[0] : undefined;
}

function FormError({ state }: { state: AuthFormState }) {
  if (!state || state.ok || state.fieldErrors) return null;
  return <Alert severity="error">{state.error}</Alert>;
}

export function DemoSignInButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const [state, action, pending] = useActionState(demoSignInAction, null);
  return (
    <Stack component="form" action={action} spacing={1} sx={{ width: fullWidth ? '100%' : undefined }}>
      <Button type="submit" variant="text" size="large" loading={pending} fullWidth={fullWidth}>
        Демо-вхід
      </Button>
      <FormError state={state} />
    </Stack>
  );
}

export function SignInForm({ demoEnabled }: { demoEnabled: boolean }) {
  const [state, action, pending] = useActionState(signInAction, null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Stack spacing={2}>
      <Stack component="form" action={action} spacing={2} noValidate>
        <FormError state={state} />
        <TextField
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={Boolean(fieldError(state, 'email'))}
          helperText={fieldError(state, 'email')}
          required
        />
        <TextField
          name="password"
          type="password"
          label="Пароль"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(fieldError(state, 'password'))}
          helperText={fieldError(state, 'password')}
          required
        />
        <Button type="submit" variant="contained" size="large" loading={pending}>
          Увійти
        </Button>
      </Stack>
      {demoEnabled && (
        <>
          <Divider>або</Divider>
          <DemoSignInButton fullWidth />
        </>
      )}
    </Stack>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, null);
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const bind = (field: keyof typeof values) => ({
    name: field,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value })),
    error: Boolean(fieldError(state, field)),
    helperText: fieldError(state, field),
  });

  return (
    <Stack component="form" action={action} spacing={2} noValidate>
      <FormError state={state} />
      <TextField label="Ім'я" autoComplete="name" required {...bind('name')} />
      <TextField label="Email" type="email" autoComplete="email" required {...bind('email')} />
      <TextField
        label="Пароль"
        type="password"
        autoComplete="new-password"
        required
        {...bind('password')}
        helperText={fieldError(state, 'password') ?? 'Щонайменше 8 символів'}
      />
      <Button type="submit" variant="contained" size="large" loading={pending}>
        Зареєструватися
      </Button>
    </Stack>
  );
}
