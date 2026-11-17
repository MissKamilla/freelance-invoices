'use client';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import { useNotify } from '@/components/feedback/SnackbarProvider';

/** Підпис + значення з кнопкою «копіювати» (IBAN, призначення платежу тощо). */
export function CopyField({ label, value, copyValue }: { label: string; value: string; copyValue?: string }) {
  const notify = useNotify();
  const copy = async () => {
    await navigator.clipboard.writeText(copyValue ?? value);
    notify(`${label}: скопійовано`);
  };

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word', fontWeight: 500 }}>
          {value}
        </Typography>
      </Stack>
      <Tooltip title="Копіювати">
        <IconButton size="small" aria-label={`Копіювати: ${label}`} onClick={copy}>
          <ContentCopyOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
