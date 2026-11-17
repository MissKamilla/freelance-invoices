'use client';
import { useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <Alert severity="error">Щось пішло не так. Спробуйте оновити сторінку.</Alert>
      <div>
        <Button variant="contained" onClick={() => retry()}>
          Спробувати ще раз
        </Button>
      </div>
    </Stack>
  );
}
