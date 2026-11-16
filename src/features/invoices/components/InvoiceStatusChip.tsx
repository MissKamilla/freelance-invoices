import Chip from '@mui/material/Chip';
import { DISPLAY_STATUS_META, type DisplayStatus } from '@/lib/invoice-status';

export function InvoiceStatusChip({ status, size = 'small' }: { status: DisplayStatus; size?: 'small' | 'medium' }) {
  const meta = DISPLAY_STATUS_META[status];
  return <Chip label={meta.label} color={meta.color} variant={meta.variant} size={size} />;
}
