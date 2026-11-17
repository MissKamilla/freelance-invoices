'use client';
import { useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';

/** Кореневий error boundary: публічна сторінка оплати, тестовий шлюз, лендінг і вхід. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Stack spacing={2}>
        <Alert severity="error">Щось пішло не так. Спробуйте оновити сторінку.</Alert>
        <div>
          <Button variant="contained" onClick={() => retry()}>
            Спробувати ще раз
          </Button>
        </div>
      </Stack>
    </Container>
  );
}
