import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@/components/Link';

/** 404 у кабінеті (чужий або неіснуючий рахунок) — із сайдбаром, а не «голий» кореневий. */
export default function PrivateNotFound() {
  return (
    <Stack spacing={2} sx={{ minHeight: '60vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Typography variant="h3" component="h1" color="primary">
        404
      </Typography>
      <Typography variant="h6">Такого рахунку чи сторінки немає</Typography>
      <Typography color="text.secondary">Можливо, посилання застаріло або рахунок належить іншому акаунту.</Typography>
      <Button component={Link} href="/invoices" variant="outlined">
        До рахунків
      </Button>
    </Stack>
  );
}
