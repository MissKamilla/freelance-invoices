import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function Loading() {
  return (
    <Stack spacing={2} aria-busy="true" aria-label="Завантаження">
      <Skeleton variant="text" width={240} height={48} />
      <Skeleton variant="rounded" height={56} />
      <Skeleton variant="rounded" height={320} />
    </Stack>
  );
}
