'use client';
import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import { reconcilePaymentAction, startPaymentAction } from '../actions';

type CardPaymentProps = {
  token: string;
  /** Стан платежу, з яким клієнт повернувся з платіжної сторінки (?payment=…). */
  returned?: { paymentId: string; status: 'PENDING' | 'FAILED' | 'MISMATCH' | 'OTHER'; failureReason: string | null };
};

const POLL_INTERVAL_MS = 2000;
const POLL_LIMIT = 30;

export function CardPayment({ token, returned }: CardPaymentProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async () => startPaymentAction(token), null);
  const [polls, setPolls] = useState(0);
  const waiting = returned?.status === 'PENDING' && polls < POLL_LIMIT;

  // Вебхук може прийти пізніше за редирект (або не прийти локально без публічного URL) —
  // звіряємо статус з провайдером і оновлюємо сторінку, поки він не зміниться.
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(async () => {
      if (returned) await reconcilePaymentAction(returned.paymentId, token);
      setPolls((n) => n + 1);
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [waiting, polls, router, returned, token]);

  if (waiting) {
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }} role="status">
        <CircularProgress size={20} />
        <Typography>Обробляємо платіж…</Typography>
      </Stack>
    );
  }

  if (returned?.status === 'MISMATCH') {
    return (
      <Alert severity="warning">
        Платіж отримано, але сума відрізняється від суми рахунку. Постачальник перевірить оплату й зв’яжеться з вами.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5} component="form" action={action}>
      {returned?.status === 'FAILED' && (
        <Alert severity="error">
          Оплата не пройшла{returned.failureReason ? `: ${returned.failureReason}` : ''}. Спробуйте ще раз або оплатіть
          переказом.
        </Alert>
      )}
      {state && !state.ok && <Alert severity="error">{state.error}</Alert>}
      <Button type="submit" variant="contained" size="large" startIcon={<CreditCardOutlined />} loading={pending} fullWidth>
        Оплатити карткою
      </Button>
    </Stack>
  );
}
