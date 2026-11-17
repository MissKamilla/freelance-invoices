'use client';
import { useActionState, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from '@/components/Link';
import { formatMoney } from '@/lib/money';
import { payWithMockCardAction } from '../actions';
import { MOCK_CARDS } from '../mock-gateway';

const formatCard = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})(?=.)/g, '$1 ');

type MockCheckoutFormProps = { paymentId: string; amount: number; backUrl: string };

export function MockCheckoutForm({ paymentId, amount, backUrl }: MockCheckoutFormProps) {
  const [card, setCard] = useState(formatCard(MOCK_CARDS.success));
  const [state, action, pending] = useActionState(async () => payWithMockCardAction(paymentId, card), null);

  return (
    <Stack component="form" action={action} spacing={2}>
      {state && !state.ok && <Alert severity="error">{state.error}</Alert>}
      <TextField
        label="Номер картки"
        value={card}
        onChange={(e) => setCard(formatCard(e.target.value))}
        slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'cc-number' } }}
      />
      <Stack direction="row" spacing={2}>
        <TextField label="Термін дії" defaultValue="12/30" slotProps={{ htmlInput: { autoComplete: 'cc-exp' } }} />
        <TextField
          label="CVV"
          defaultValue="123"
          type="password"
          slotProps={{ htmlInput: { autoComplete: 'cc-csc' } }}
        />
      </Stack>
      <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2, color: 'text.secondary', typography: 'caption' }}>
        <li>{formatCard(MOCK_CARDS.success)} — успішна оплата</li>
        <li>{formatCard(MOCK_CARDS.declined)} — відмова банку</li>
        <li>{formatCard(MOCK_CARDS.amountMismatch)} — списано на 1 коп. менше</li>
      </Stack>
      <Button type="submit" variant="contained" size="large" loading={pending}>
        Оплатити {formatMoney(amount)}
      </Button>
      <Button component={Link} href={backUrl} disabled={pending}>
        Скасувати й повернутися до рахунку
      </Button>
    </Stack>
  );
}
