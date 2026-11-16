'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

type Notify = (message: string, severity?: AlertColor) => void;

const SnackbarContext = createContext<Notify | null>(null);

type Toast = { key: number; message: string; severity: AlertColor };

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback<Notify>((message, severity = 'success') => {
    setToast({ key: Date.now(), message, severity });
    setOpen(true);
  }, []);

  return (
    <SnackbarContext value={notify}>
      {children}
      <Snackbar
        key={toast?.key}
        open={open}
        autoHideDuration={4000}
        onClose={(_, reason) => reason !== 'clickaway' && setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={toast?.severity ?? 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </SnackbarContext>
  );
}

export function useNotify(): Notify {
  const notify = useContext(SnackbarContext);
  if (!notify) throw new Error('useNotify must be used inside <SnackbarProvider>');
  return notify;
}
